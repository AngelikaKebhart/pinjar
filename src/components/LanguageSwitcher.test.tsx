// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { LANGUAGE_NAMES } from '@/src/i18n/language';
import { CATALOGS, LANGUAGES } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { languagePreference } from '@/src/lib/settings';
import { LanguageSwitcher } from './LanguageSwitcher';

const en = CATALOGS.en;
const de = CATALOGS.de;

/**
 * Renders the switcher against the real provider and opens its menu: the point
 * of this component is the round trip from picking a language to the interface
 * changing, which a stubbed context could not show.
 */
async function openMenu(): Promise<void> {
  render(
    <TranslationProvider>
      <LanguageSwitcher />
    </TranslationProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: en['settings.language.label'] ?? '' }));
}

/** Picks an option the way a user does, with the pointer — which also closes the menu. */
function pick(name: string): void {
  const option = screen.getByRole('radio', { name });

  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
    document.documentElement.lang = '';
  });

  afterEach(cleanup);

  // An icon has no accessible name of its own, so the button carries the name
  // of the setting it opens (WCAG 2.2 AA, 4.1.2).
  it('names the button after the setting, in the active language', async () => {
    await openMenu();

    expect(screen.getByRole('button', { name: en['settings.language.label'] ?? '' })).toBeTruthy();
  });

  it('offers "automatic" plus every shipped language', async () => {
    await openMenu();

    const values = screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'));

    expect(values).toEqual(['auto', ...LANGUAGES]);
  });

  // WCAG 3.1.2: each option is written in its own language, so it stays
  // readable for a user who ended up in a language they do not understand — and
  // lang= tells the screen reader to pronounce it that way.
  it('names each language in its own language and marks it as such', async () => {
    await openMenu();

    for (const language of LANGUAGES) {
      const option = screen.getByRole('radio', { name: LANGUAGE_NAMES[language] });

      expect(option.closest('label')?.querySelector('span')?.getAttribute('lang')).toBe(language);
    }
  });

  it('switches the interface and stores the choice', async () => {
    await openMenu();

    pick(LANGUAGE_NAMES.de);

    expect(
      await screen.findByRole('button', { name: de['settings.language.label'] ?? '' }),
    ).toBeTruthy();
    expect(document.documentElement.lang).toBe('de');
    await expect(languagePreference.getValue()).resolves.toBe('de');
  });

  it('shows the stored preference rather than the resolved language', async () => {
    await openMenu();

    // "auto" resolves to English here, but the menu must still show that the
    // user has not made a choice, otherwise switching back to it is impossible.
    expect(screen.getByRole('radio', { name: en['settings.language.auto'] ?? '' })).toHaveProperty(
      'checked',
      true,
    );
  });
});
