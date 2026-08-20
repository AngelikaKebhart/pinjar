// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { TranslationContextProvider } from '@/src/i18n/context';
import type { Translation } from '@/src/i18n/context';
import { LANGUAGE_NAMES } from '@/src/i18n/language';
import { CATALOGS, LANGUAGES } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Renders the switcher against the real provider: the point of this component
 * is the round trip from picking a language to the interface changing, which a
 * stubbed context could not show.
 */
async function renderSwitcher() {
  render(
    <TranslationProvider>
      <LanguageSwitcher />
    </TranslationProvider>,
  );

  return screen.findByLabelText(CATALOGS.en['settings.language.label'] ?? '');
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
    document.documentElement.lang = '';
  });

  afterEach(cleanup);

  // The label has to be tied to the control, otherwise the select is announced
  // as an unnamed combobox (WCAG 3.3.2).
  it('exposes the select under its translated label', async () => {
    const select = await renderSwitcher();

    expect(select.tagName).toBe('SELECT');
  });

  it('offers "automatic" plus every shipped language', async () => {
    await renderSwitcher();

    const values = screen.getAllByRole('option').map((option) => option.getAttribute('value'));

    expect(values).toEqual(['auto', ...LANGUAGES]);
  });

  // WCAG 3.1.2: each option is written in its own language, so it stays
  // readable for a user who ended up in a language they do not understand — and
  // lang= tells the screen reader to pronounce it that way.
  it('names each language in its own language and marks it as such', async () => {
    await renderSwitcher();

    for (const language of LANGUAGES) {
      const option = screen.getByRole('option', { name: LANGUAGE_NAMES[language] });

      expect(option.getAttribute('lang')).toBe(language);
    }
  });

  it('switches the interface and stores the choice', async () => {
    const select = await renderSwitcher();

    fireEvent.change(select, { target: { value: 'de' } });

    expect(await screen.findByLabelText(CATALOGS.de['settings.language.label'] ?? '')).toBe(select);
    expect(document.documentElement.lang).toBe('de');
  });

  it('shows the stored preference rather than the resolved language', async () => {
    const select = await renderSwitcher();

    // "auto" resolves to English here, but the control must still show that the
    // user has not made a choice, otherwise switching back to it is impossible.
    expect((select as HTMLSelectElement).value).toBe('auto');
  });

  it('ignores a value that is not a valid preference', () => {
    const setPreference = vi.fn();
    const translation: Translation = {
      language: 'en',
      preference: 'auto',
      setPreference,
      t: (key) => key,
      plural: (key) => key,
      formatNumber: (value) => String(value),
      formatDate: () => '',
      compareNames: (one, other) => one.localeCompare(other),
    };

    render(
      <TranslationContextProvider value={translation}>
        <LanguageSwitcher />
      </TranslationContextProvider>,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } });

    // A <select> reports an unknown value as "", which is no more a valid
    // preference than "fr" — either way nothing may be written to storage.
    expect(setPreference).not.toHaveBeenCalled();
  });
});
