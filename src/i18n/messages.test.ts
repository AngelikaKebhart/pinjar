import { describe, expect, it } from 'vitest';
import { CATALOGS, LANGUAGES, PLURAL_SUFFIXES } from './messages';

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/** English is the reference catalog every other language is compared against. */
const referenceKeys = Object.keys(CATALOGS.en).sort();

function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1] ?? '').sort();
}

function pluralBaseKeys(): string[] {
  return Object.keys(CATALOGS.en)
    .filter((key) => key.endsWith('_other'))
    .map((key) => key.slice(0, -'_other'.length));
}

describe('message catalogs', () => {
  it.each(LANGUAGES)('%s has exactly the same keys as the reference', (language) => {
    expect(Object.keys(CATALOGS[language]).sort()).toEqual(referenceKeys);
  });

  it.each(LANGUAGES)('%s has no empty messages', (language) => {
    const empty = Object.entries(CATALOGS[language])
      .filter(([, message]) => message.trim() === '')
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it('uses the same placeholders in every language', () => {
    for (const key of referenceKeys) {
      const expected = placeholdersOf(CATALOGS.en[key] ?? '');

      for (const language of LANGUAGES) {
        expect(placeholdersOf(CATALOGS[language][key] ?? ''), `${language} / ${key}`).toEqual(
          expected,
        );
      }
    }
  });

  it('provides "one" and "other" for every plural message', () => {
    const bases = pluralBaseKeys();
    expect(bases.length).toBeGreaterThan(0);

    for (const base of bases) {
      for (const language of LANGUAGES) {
        expect(CATALOGS[language], `${language} / ${base}`).toHaveProperty(`${base}_one`);
        expect(CATALOGS[language], `${language} / ${base}`).toHaveProperty(`${base}_other`);
      }
    }
  });

  it('reserves the underscore for plural suffixes only', () => {
    const unexpected = referenceKeys.filter(
      (key) => key.includes('_') && !PLURAL_SUFFIXES.some((suffix) => key.endsWith(`_${suffix}`)),
    );

    expect(unexpected).toEqual([]);
  });
});
