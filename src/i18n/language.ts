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
 *
 * The preference is matched against the shipped languages instead of being
 * returned as given: its type says it is valid, but it originates from storage,
 * which an import file or an older version could have left holding a language
 * this build does not ship. Passing such a value on would select a catalog that
 * does not exist and take the whole UI down.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  browserLanguage: string | undefined,
): Language {
  const chosenLanguage = LANGUAGES.find((language) => language === preference);

  if (chosenLanguage !== undefined) {
    return chosenLanguage;
  }

  // Matches "de", "de-DE", "de-AT", … but not "der" or unrelated tags.
  const primaryTag = (browserLanguage ?? '').toLowerCase().split('-')[0];

  return LANGUAGES.find((language) => language === primaryTag) ?? FALLBACK_LANGUAGE;
}
