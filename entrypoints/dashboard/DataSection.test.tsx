// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useTranslation } from '@/src/i18n/context';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { addSavedLink } from '@/src/lib/storage';
import { EXPORT_FORMAT } from '@/src/lib/transfer';
import { DataSection } from './DataSection';

/** What the browser was handed to save, once the export ran. */
let downloaded: { blob: Blob; fileName: string; wasInDocument: boolean } | null = null;

interface RenderOptions {
  language?: string;
  hasSavedLinks?: boolean;
}

async function renderSection({
  language = 'en-US',
  hasSavedLinks = true,
}: RenderOptions = {}): Promise<void> {
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => language });

  render(
    <TranslationProvider>
      <LanguageToggle />
      <DataSection hasSavedLinks={hasSavedLinks} />
    </TranslationProvider>,
  );

  // The catalog is read from storage, so the first paint carries no text yet.
  await screen.findByRole('button', { name: /^(Export as a file|Als Datei exportieren)$/ });
}

/** Switches the interface language the way the dashboard's own switcher does. */
function LanguageToggle() {
  const { setPreference } = useTranslation();

  return (
    <button type="button" onClick={() => setPreference('en')}>
      switch to English
    </button>
  );
}

function exportButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Export as a file' });
}

function message(): string {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

async function exportedFile(): Promise<unknown> {
  await waitFor(() => expect(downloaded).not.toBeNull());

  return JSON.parse(await (downloaded as { blob: Blob }).blob.text());
}

beforeEach(() => {
  fakeBrowser.reset();
  downloaded = null;

  // jsdom has no object URLs and downloads nothing, so the handover is
  // captured instead. Only the two static methods are replaced — swapping the
  // whole URL global would break `new URL()`, and with it every saved link.
  let pending: Blob | null = null;
  define(URL, 'createObjectURL', (blob: Blob) => {
    pending = blob;
    return 'blob:captured';
  });
  define(URL, 'revokeObjectURL', () => undefined);

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (pending !== null) {
      downloaded = { blob: pending, fileName: this.download, wasInDocument: this.isConnected };
    }
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Adds a method jsdom does not implement, without replacing its owner. */
function define(target: object, name: string, value: unknown): void {
  Object.defineProperty(target, name, { value, configurable: true, writable: true });
}

describe('exporting', () => {
  it('hands the browser a file named after the extension and the day', async () => {
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloaded).not.toBeNull());
    expect(downloaded?.fileName).toMatch(/^universal-wishlist-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('writes every saved link into it', async () => {
    await addSavedLink({ url: 'https://shop.example/jersey', title: 'Jersey fabric' });
    await renderSection();

    fireEvent.click(exportButton());

    await expect(exportedFile()).resolves.toMatchObject({
      format: EXPORT_FORMAT,
      links: [{ url: 'https://shop.example/jersey', title: 'Jersey fabric' }],
    });
  });

  /*
   * Firefox ignores a click on a link that is not part of the page, and the
   * export would fail there with nothing to show for it.
   */
  it('clicks a link that is part of the document', async () => {
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloaded).not.toBeNull());
    expect(downloaded?.wasInDocument).toBe(true);
  });
});

describe('with nothing saved', () => {
  it('has nothing to export, and says so instead of warning about notes', async () => {
    await renderSection({ hasSavedLinks: false });

    expect(exportButton()).toHaveProperty('disabled', true);
    expect(screen.getByText(/nothing to export/i)).toBeTruthy();
    expect(screen.queryByText(/not encrypted/i)).toBeNull();
  });

  it('offers the export again as soon as something is saved', async () => {
    await renderSection({ hasSavedLinks: true });

    expect(exportButton()).toHaveProperty('disabled', false);
    expect(screen.getByText(/not encrypted/i)).toBeTruthy();
  });
});

describe('the confirmation', () => {
  // Where the file ends up is the browser's business, so this is the only
  // feedback the extension itself gives — it may not be easy to miss.
  it('appears out loud once the file is written', async () => {
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(message()).toContain('your browser is saving the file'));
  });

  it('stays out of the way until there is something to say', async () => {
    await renderSection();

    expect(message()).toBe('');
    expect(screen.getByText(/not encrypted/i)).toBeTruthy();
  });

  /*
   * Kept as a key rather than as finished text: a sentence built in German
   * would otherwise still be standing there in German after the dashboard was
   * switched to English (docs/concept.md §3.7).
   */
  it('changes language along with the interface', async () => {
    await renderSection({ language: 'de-DE' });

    fireEvent.click(screen.getByRole('button', { name: 'Als Datei exportieren' }));
    await waitFor(() => expect(message()).toContain('dein Browser speichert die Datei'));

    fireEvent.click(screen.getByRole('button', { name: 'switch to English' }));

    await waitFor(() => expect(message()).toContain('your browser is saving the file'));
  });

  // Its border says "this went well" in color alone, which not everyone can
  // see; the glyph in front of it says the same thing in shape.
  it('carries a marker that is seen but not read out', async () => {
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(message()).toContain('✓'));
    expect(screen.getByText('✓').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('the German interface', () => {
  it('translates the whole section', async () => {
    await renderSection({ language: 'de-DE' });

    expect(screen.getByRole('button', { name: 'Als Datei exportieren' })).toBeTruthy();
    expect(screen.getByText(/unverschlüsselt/i)).toBeTruthy();
  });

  it('translates the empty case too', async () => {
    await renderSection({ language: 'de-DE', hasSavedLinks: false });

    expect(screen.getByText(/nichts zu exportieren/i)).toBeTruthy();
  });
});
