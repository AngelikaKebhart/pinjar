import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { languagePreference } from './settings';

describe('languagePreference', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('follows the browser language until the user chooses otherwise', async () => {
    await expect(languagePreference.getValue()).resolves.toBe('auto');
  });

  it('keeps an explicit choice', async () => {
    await languagePreference.setValue('de');

    await expect(languagePreference.getValue()).resolves.toBe('de');
  });

  it('can be set back to auto', async () => {
    await languagePreference.setValue('en');
    await languagePreference.setValue('auto');

    await expect(languagePreference.getValue()).resolves.toBe('auto');
  });

  // Renaming the key would silently discard the choice of every existing user,
  // and later break import files written by an older version.
  it('stores the choice under a stable key', async () => {
    await languagePreference.setValue('de');

    await expect(fakeBrowser.storage.local.get('languagePreference')).resolves.toEqual({
      languagePreference: 'de',
    });
  });

  // Validation lives in resolveLanguage, which is what makes a value like this
  // harmless; see the matching case in src/i18n/language.test.ts.
  it('hands back an unsupported stored value unchanged instead of validating it', async () => {
    await fakeBrowser.storage.local.set({ languagePreference: 'fr' });

    await expect(languagePreference.getValue()).resolves.toBe('fr');
  });

  it('notifies watchers about a change', async () => {
    const seen: string[] = [];
    const unwatch = languagePreference.watch((value) => seen.push(value));

    await languagePreference.setValue('de');
    unwatch();
    await languagePreference.setValue('en');

    expect(seen).toEqual(['de']);
  });
});
