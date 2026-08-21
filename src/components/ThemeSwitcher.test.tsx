// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { themePreference } from '@/src/lib/settings';
import { ThemeProvider } from './ThemeProvider';
import { ThemeSwitcher } from './ThemeSwitcher';

/**
 * Renders the switcher against the real providers: what matters here is the
 * round trip from picking a scheme to the document carrying it, which a
 * stubbed context could not show.
 */
async function renderSwitcher() {
  render(
    <ThemeProvider>
      <TranslationProvider>
        <ThemeSwitcher />
      </TranslationProvider>
    </ThemeProvider>,
  );

  return screen.findByLabelText(CATALOGS.en['settings.theme.label'] ?? '');
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
    delete document.documentElement.dataset.theme;
  });

  afterEach(cleanup);

  // The label has to be tied to the control, otherwise the select is announced
  // as an unnamed combobox (WCAG 3.3.2).
  it('exposes the select under its translated label', async () => {
    const select = await renderSwitcher();

    expect(select.tagName).toBe('SELECT');
  });

  it('offers "automatic" plus both schemes', async () => {
    await renderSwitcher();

    const values = screen.getAllByRole('option').map((option) => option.getAttribute('value'));

    expect(values).toEqual(['auto', 'light', 'dark']);
  });

  /*
   * The attribute is the whole mechanism: the stylesheet reads the scheme off
   * it, so a choice that never reaches the document changes nothing on screen.
   */
  it('marks the document with the chosen scheme and stores it', async () => {
    const select = await renderSwitcher();

    fireEvent.change(select, { target: { value: 'dark' } });

    expect(document.documentElement.dataset.theme).toBe('dark');
    await expect(themePreference.getValue()).resolves.toBe('dark');
  });

  /*
   * "auto" is the absence of an answer, not an answer of its own: only without
   * the attribute does `color-scheme: light dark` follow the browser again.
   */
  it('takes the mark off again when the choice goes back to automatic', async () => {
    const select = await renderSwitcher();

    fireEvent.change(select, { target: { value: 'dark' } });
    fireEvent.change(select, { target: { value: 'auto' } });

    expect(document.documentElement.dataset.theme).toBeUndefined();
    await expect(themePreference.getValue()).resolves.toBe('auto');
  });

  // The popup reads the same setting, so a choice made in the dashboard has to
  // arrive in a popup that is already open.
  it('follows a change made elsewhere', async () => {
    const select = await renderSwitcher();

    await themePreference.setValue('light');

    expect(await screen.findByDisplayValue(CATALOGS.en['settings.theme.light'] ?? '')).toBe(select);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
