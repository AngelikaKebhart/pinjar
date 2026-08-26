import type { Language, MessageCatalog } from './messages';

export type MessageParams = Record<string, string | number>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Replaces `{name}` placeholders with the given values. An unknown one is left
 * as-is rather than becoming "undefined", so the mistake is visible in the UI
 * instead of silently producing wrong text.
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
 * Looks up a message and fills in its placeholders. A missing key falls back to
 * the key itself: recognizable in development and still readable if it reaches
 * a user, unlike an empty string or an error that takes the view down.
 */
export function translate(catalog: MessageCatalog, key: string, params?: MessageParams): string {
  const template = catalog[key];
  return template === undefined ? key : interpolate(template, params);
}

/**
 * Picks the plural form matching `count` in the given language and fills it in.
 *
 * `count` is available as a placeholder without being passed, since a plural
 * message practically always shows the number it counts, and it is applied last
 * so a disagreeing `count` in `params` cannot produce a mismatched message.
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

  return interpolate(template, { ...params, count });
}

export function formatNumber(
  language: Language,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(language, options).format(value);
}

/**
 * Formats a date in the active language. An unparsable value yields an empty
 * string rather than the `RangeError` `Intl` would throw: timestamps can come
 * from an imported file, and one broken field must not take down the view
 * listing it. A caller wanting a visible placeholder adds a translated one —
 * this layer invents no user-facing text.
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

/**
 * Compares two names the way the active language reads them. Not a plain `<`:
 * German umlauts do not sort where their code points would put them, so
 * "Österreich" would land after "Recht" instead of beside "O".
 */
export function compareNames(language: Language, one: string, other: string): number {
  return one.localeCompare(other, language);
}
