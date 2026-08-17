// @vitest-environment jsdom
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { languagePreference } from '@/src/lib/settings';
import { useTranslation } from './context';
import { CATALOGS } from './messages';
import type { LanguagePreference } from './messages';
import { TranslationProvider } from './TranslationProvider';

/** Renders everything a consumer receives, so assertions can read it off the DOM. */
function TranslationProbe() {
  const { language, preference, setPreference, t } = useTranslation();

  return (
    <div>
      <p data-testid="language">{language}</p>
      <p data-testid="preference">{preference}</p>
      <p data-testid="message">{t('settings.language.label')}</p>
      <button type="button" onClick={() => setPreference('de')}>
        switch
      </button>
    </div>
  );
}

function setBrowserLanguage(tag: string) {
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => tag });
}

function textOf(testId: string): string | null {
  return screen.getByTestId(testId).textContent;
}

/**
 * Renders the provider and waits for the stored preference to arrive, since the
 * provider deliberately renders nothing before that.
 */
async function renderProvider() {
  const result = render(
    <TranslationProvider>
      <TranslationProbe />
    </TranslationProvider>,
  );

  await screen.findByTestId('language');

  return result;
}

describe('TranslationProvider', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    setBrowserLanguage('en-US');
    document.documentElement.lang = '';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts in the browser language while the user has not chosen one', async () => {
    setBrowserLanguage('de-AT');

    await renderProvider();

    expect(textOf('language')).toBe('de');
    expect(textOf('preference')).toBe('auto');
    expect(textOf('message')).toBe(CATALOGS.de['settings.language.label']);
  });

  it('starts in English for a browser language that is not shipped', async () => {
    setBrowserLanguage('fr-FR');

    await renderProvider();

    expect(textOf('language')).toBe('en');
    expect(textOf('message')).toBe(CATALOGS.en['settings.language.label']);
  });

  it('honours a stored choice over the browser language', async () => {
    setBrowserLanguage('de-DE');
    await languagePreference.setValue('en');

    await renderProvider();

    expect(textOf('language')).toBe('en');
    expect(textOf('preference')).toBe('en');
  });

  // WCAG 3.1.1: a screen reader picks its pronunciation from this attribute, so
  // German text under lang="en" is read out unintelligibly.
  it('declares the active language on the html element and keeps it in sync', async () => {
    setBrowserLanguage('de-DE');

    await renderProvider();

    expect(document.documentElement.lang).toBe('de');

    await act(async () => {
      await languagePreference.setValue('en');
    });

    expect(document.documentElement.lang).toBe('en');
  });

  // Popup and Dashboard are separate documents with their own provider; the
  // watch subscription is what makes a switch in one reach the other.
  it('picks up a change made in another document', async () => {
    await renderProvider();

    await act(async () => {
      await languagePreference.setValue('de');
    });

    expect(textOf('language')).toBe('de');
    expect(textOf('preference')).toBe('de');
  });

  it('persists the choice a consumer makes', async () => {
    await renderProvider();

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(textOf('language')).toBe('de');
    await expect(languagePreference.getValue()).resolves.toBe('de');
  });

  it('renders nothing until the stored preference is known', async () => {
    let releaseStoredValue!: (preference: LanguagePreference) => void;
    vi.spyOn(languagePreference, 'getValue').mockReturnValue(
      new Promise<LanguagePreference>((resolve) => {
        releaseStoredValue = resolve;
      }),
    );

    const { container } = render(
      <TranslationProvider>
        <TranslationProbe />
      </TranslationProvider>,
    );

    // Rendering the browser language first and correcting it afterwards would
    // show the user a visible flash of the wrong language.
    expect(container.innerHTML).toBe('');

    await act(async () => {
      releaseStoredValue('de');
    });

    expect(textOf('language')).toBe('de');
  });

  it('still renders the UI when the stored preference cannot be read', async () => {
    vi.spyOn(languagePreference, 'getValue').mockRejectedValue(new Error('storage unavailable'));
    setBrowserLanguage('de-DE');

    await renderProvider();

    // Losing the stored choice is acceptable; a permanently blank popup with no
    // hint of what went wrong is not.
    expect(textOf('preference')).toBe('auto');
    expect(textOf('language')).toBe('de');
  });

  it('stops listening once it is unmounted', async () => {
    const unwatch = vi.fn();
    vi.spyOn(languagePreference, 'watch').mockReturnValue(unwatch);

    await renderProvider();
    expect(unwatch).not.toHaveBeenCalled();

    cleanup();

    expect(unwatch).toHaveBeenCalledOnce();
  });
});
