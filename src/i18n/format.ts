import type { Language, MessageCatalog } from './messages';

export type MessageParams = Record<string, string | number>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Replaces `{name}` placeholders with the given values.
 *
 * An unknown placeholder is left as-is rather than replaced with "undefined",
 * so a mistake is visible in the UI instead of silently producing wrong text.
 */
export function interpolate(template: string, params?: MessageParams): string {
  if (params === undefined) {
    return template;
  }

  return template.replace(PLACEHOLDER_PATTERN, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

/**
 * Looks up a message and fills in its placeholders.
 *
 * A missing key falls back to the key itself: that is recognizable during
 * development and still readable if it ever reaches a user, unlike an empty
 * string or a thrown error that would take the whole view down.
 */
export function translate(catalog: MessageCatalog, key: string, params?: MessageParams): string {
  const template = catalog[key];
  return template === undefined ? key : interpolate(template, params);
}

/**
 * Picks the plural form matching `count` in the given language and fills it in.
 *
 * `count` is always available as a placeholder without passing it explicitly,
 * since a plural message practically always shows the number it counts.
 */
export function translatePlural(
  catalog: MessageCatalog,
  language: Language,
  key: string,
  count: number,
  params?: MessageParams,
): string {
  const category = new Intl.PluralRules(language).select(count);
  // "other" exists in every language and is the safety net if a catalog is
  // missing the more specific form.
  const template = catalog[`${key}_${category}`] ?? catalog[`${key}_other`];

  if (template === undefined) {
    return key;
  }

  return interpolate(template, { count, ...params });
}

export function formatNumber(
  language: Language,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(language, options).format(value);
}

/**
 * Formats a date in the active language.
 *
 * An unparsable value yields an empty string rather than the `RangeError` that
 * `Intl` would throw: timestamps can come from an imported file, and one broken
 * field must not take down the view listing it. Callers that need a visible
 * placeholder add a translated one — this layer must not invent user-facing
 * text of its own.
 */
export function formatDate(
  language: Language,
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(language, options).format(date);
}
