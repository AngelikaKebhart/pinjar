// @vitest-environment jsdom
// act() comes from Testing Library, not from React: only its wrapper marks the
// surrounding code as an act environment, which React otherwise warns about.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { languagePreference } from '@/src/lib/settings';
import { useTranslation } from './context';
import { CATALOGS } from './messages';
import type { Language, LanguagePreference } from './messages';
import { TranslationProvider } from './TranslationProvider';

const SAMPLE_COUNT = 1;
const SAMPLE_NUMBER = 1234.5;
const SAMPLE_DATE = '2026-03-07T12:00:00.000Z';

/** Renders everything a consumer receives, so assertions can read it off the DOM. */
function TranslationProbe() {
  const { language, preference, setPreference, t, plural, formatNumber, formatDate } =
    useTranslation();

  return (
    <div>
      <p data-testid="language">{language}</p>
      <p data-testid="preference">{preference}</p>
      <p data-testid="message">{t('settings.language.label')}</p>
      <p data-testid="plural">{plural('dashboard.savedLinks.count', SAMPLE_COUNT)}</p>
      <p data-testid="number">{formatNumber(SAMPLE_NUMBER)}</p>
      <p data-testid="date">{formatDate(SAMPLE_DATE)}</p>
      <button type="button" onClick={() => setPreference('de')}>
        switch
      </button>
    </div>
  );
}

/**
 * What the catalog and the native `Intl` APIs produce for a language, so the
 * assertions describe the expected language rather than repeating the
 * formatting implementation.
 */
function expectedFor(language: Language) {
  return {
    plural: CATALOGS[language]['dashboard.savedLinks.count_one']?.replace(
      '{count}',
      String(SAMPLE_COUNT),
    ),
    number: new Intl.NumberFormat(language).format(SAMPLE_NUMBER),
    date: new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(SAMPLE_DATE)),
  };
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

  // The formatting helpers take the language as an argument, so the provider is
  // the only place that binds them to the one currently active.
  it('hands out plural, number and date formatting bound to the active language', async () => {
    setBrowserLanguage('de-DE');

    await renderProvider();

    const expected = expectedFor('de');
    expect(textOf('plural')).toBe(expected.plural);
    expect(textOf('number')).toBe(expected.number);
    expect(textOf('date')).toBe(expected.date);
  });

  it('rebinds the formatting to the new language after a switch', async () => {
    await renderProvider();
    expect(textOf('number')).toBe(expectedFor('en').number);

    await act(async () => {
      await languagePreference.setValue('de');
    });

    const expected = expectedFor('de');
    expect(textOf('plural')).toBe(expected.plural);
    expect(textOf('number')).toBe(expected.number);
    expect(textOf('date')).toBe(expected.date);
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
