import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from './messages';

/**
 * The manifest and the store listing are translated by the browser's native
 * `_locales` mechanism, not by the catalogs in this folder (see
 * docs/concept.md §6.3). It is a second set of files that can drift apart just
 * as easily — but a mistake there only surfaces in the store listing, so it is
 * checked here.
 */
const LOCALES_DIRECTORY = fileURLToPath(new URL('../../public/_locales', import.meta.url));
const WXT_CONFIG = fileURLToPath(new URL('../../wxt.config.ts', import.meta.url));

/** A `__MSG_key__` reference as the manifest writes it. */
const MESSAGE_REFERENCE_PATTERN = /__MSG_(\w+)__/g;

interface ManifestMessage {
  message: string;
  description?: string;
}

function readCatalog(language: string): Record<string, ManifestMessage> {
  return JSON.parse(readFileSync(`${LOCALES_DIRECTORY}/${language}/messages.json`, 'utf8'));
}

const shippedLocales = readdirSync(LOCALES_DIRECTORY);
const referenceKeys = Object.keys(readCatalog('en')).sort();

describe('manifest message catalogs', () => {
  it('ships a locale for every language the interface offers', () => {
    expect(shippedLocales.sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(shippedLocales)('%s has exactly the same keys as the reference', (language) => {
    expect(Object.keys(readCatalog(language)).sort()).toEqual(referenceKeys);
  });

  it.each(shippedLocales)('%s has no empty messages', (language) => {
    const empty = Object.entries(readCatalog(language))
      .filter(([, entry]) => entry.message.trim() === '')
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  // The description is what a translator sees instead of the surrounding UI,
  // and browsers surface it in their own tooling.
  it.each(shippedLocales)('%s explains every message to translators', (language) => {
    const undocumented = Object.entries(readCatalog(language))
      .filter(([, entry]) => (entry.description ?? '').trim() === '')
      .map(([key]) => key);

    expect(undocumented).toEqual([]);
  });

  // Without this check, renaming a key here leaves the manifest pointing at a
  // message that no longer exists — and the extension installs with the literal
  // text "__MSG_extensionName__" as its name.
  it('resolves every message the manifest references', () => {
    const referenced = [
      ...new Set(
        [...readFileSync(WXT_CONFIG, 'utf8').matchAll(MESSAGE_REFERENCE_PATTERN)].map(
          (match) => match[1] ?? '',
        ),
      ),
    ];

    expect(referenced.length).toBeGreaterThan(0);

    for (const language of shippedLocales) {
      const catalog = readCatalog(language);

      for (const key of referenced) {
        expect(catalog, `${language} / ${key}`).toHaveProperty(key);
      }
    }
  });
});
