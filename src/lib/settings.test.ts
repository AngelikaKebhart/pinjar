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

  it('notifies watchers about a change', async () => {
    const seen: string[] = [];
    const unwatch = languagePreference.watch((value) => seen.push(value));

    await languagePreference.setValue('de');
    unwatch();
    await languagePreference.setValue('en');

    expect(seen).toEqual(['de']);
  });
});
