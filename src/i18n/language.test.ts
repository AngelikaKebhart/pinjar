import { describe, expect, it } from 'vitest';
import { isLanguagePreference, LANGUAGE_NAMES, resolveLanguage } from './language';
import { LANGUAGES } from './messages';

describe('resolveLanguage', () => {
  it('honours an explicit choice regardless of the browser language', () => {
    expect(resolveLanguage('de', 'en-US')).toBe('de');
    expect(resolveLanguage('en', 'de-DE')).toBe('en');
  });

  it('follows the browser language when set to auto', () => {
    expect(resolveLanguage('auto', 'de')).toBe('de');
    expect(resolveLanguage('auto', 'de-DE')).toBe('de');
    expect(resolveLanguage('auto', 'de-AT')).toBe('de');
    expect(resolveLanguage('auto', 'DE-CH')).toBe('de');
  });

  it('falls back to English for any other browser language', () => {
    expect(resolveLanguage('auto', 'fr-FR')).toBe('en');
    expect(resolveLanguage('auto', 'en-GB')).toBe('en');
  });

  it('does not treat a language merely starting with "de" as German', () => {
    expect(resolveLanguage('auto', 'den')).toBe('en');
  });

  it('survives a missing or empty browser language', () => {
    expect(resolveLanguage('auto', undefined)).toBe('en');
    expect(resolveLanguage('auto', '')).toBe('en');
  });
});

describe('isLanguagePreference', () => {
  it('accepts the supported languages and auto', () => {
    expect(isLanguagePreference('auto')).toBe(true);
    expect(isLanguagePreference('de')).toBe(true);
    expect(isLanguagePreference('en')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLanguagePreference('fr')).toBe(false);
    expect(isLanguagePreference('')).toBe(false);
    expect(isLanguagePreference('DE')).toBe(false);
  });
});

describe('LANGUAGE_NAMES', () => {
  it('names every supported language in its own language', () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_NAMES[language]).toBeTruthy();
    }

    expect(LANGUAGE_NAMES.de).toBe('Deutsch');
    expect(LANGUAGE_NAMES.en).toBe('English');
  });
});
