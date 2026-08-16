import { LANGUAGES } from './messages';
import type { Language, LanguagePreference } from './messages';

const FALLBACK_LANGUAGE: Language = 'en';

/**
 * Names of the languages, each written in its own language.
 *
 * Deliberately not translated: a user who switched to a language they cannot
 * read must still be able to find their way back (WCAG 3.1.2, and the reason
 * language pickers everywhere work this way).
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
};

/**
 * Determines the language to display in.
 *
 * A stored preference always wins; only "auto" consults the browser. Anything
 * that is not German falls back to English, matching the default locale of the
 * manifest.
 */
/** Narrows a raw value — e.g. from a `<select>` — to a valid preference. */
export function isLanguagePreference(value: string): value is LanguagePreference {
  return value === 'auto' || LANGUAGES.some((language) => language === value);
}

export function resolveLanguage(
  preference: LanguagePreference,
  browserLanguage: string | undefined,
): Language {
  if (preference !== 'auto') {
    return preference;
  }

  // Matches "de", "de-DE", "de-AT", … but not "der" or unrelated tags.
  const primaryTag = (browserLanguage ?? '').toLowerCase().split('-')[0];

  return LANGUAGES.find((language) => language === primaryTag) ?? FALLBACK_LANGUAGE;
}
