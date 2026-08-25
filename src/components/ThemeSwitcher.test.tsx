// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { themePreference } from '@/src/lib/settings';
import { ThemeProvider } from './ThemeProvider';
import { ThemeSwitcher } from './ThemeSwitcher';

const en = CATALOGS.en;

/**
 * Renders the switcher against the real providers and opens its menu: what
 * matters here is the round trip from picking a scheme to the document carrying
 * it, which a stubbed context could not show.
 */
async function openMenu(): Promise<void> {
  render(
    <ThemeProvider>
      <TranslationProvider>
        <ThemeSwitcher />
      </TranslationProvider>
    </ThemeProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: en['settings.theme.label'] ?? '' }));
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
    delete document.documentElement.dataset.theme;
  });

  afterEach(cleanup);

  // An icon has no accessible name of its own, so the button carries the name
  // of the setting it opens (WCAG 2.2 AA, 4.1.2).
  it('names the button after the setting, in the active language', async () => {
    await openMenu();

    expect(screen.getByRole('button', { name: en['settings.theme.label'] ?? '' })).toBeTruthy();
  });

  it('offers "automatic" plus both schemes', async () => {
    await openMenu();

    const values = screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'));

    expect(values).toEqual(['auto', 'light', 'dark']);
  });

  /*
   * The attribute is the whole mechanism: the stylesheet reads the scheme off
   * it, so a choice that never reaches the document changes nothing on screen.
   */
  it('marks the document with the chosen scheme and stores it', async () => {
    await openMenu();

    fireEvent.click(screen.getByRole('radio', { name: en['settings.theme.dark'] ?? '' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    await expect(themePreference.getValue()).resolves.toBe('dark');
  });

  /*
   * "auto" is the absence of an answer, not an answer of its own: only without
   * the attribute does `color-scheme: light dark` follow the browser again.
   */
  it('takes the mark off again when the choice goes back to automatic', async () => {
    await openMenu();

    fireEvent.click(screen.getByRole('radio', { name: en['settings.theme.dark'] ?? '' }));
    fireEvent.click(screen.getByRole('radio', { name: en['settings.theme.auto'] ?? '' }));

    expect(document.documentElement.dataset.theme).toBeUndefined();
    await expect(themePreference.getValue()).resolves.toBe('auto');
  });

  // The popup reads the same setting, so a choice made in the dashboard has to
  // arrive in a popup that is already open.
  it('follows a change made elsewhere', async () => {
    await openMenu();

    await themePreference.setValue('light');

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: en['settings.theme.light'] ?? '' })).toHaveProperty(
        'checked',
        true,
      );
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });
});
