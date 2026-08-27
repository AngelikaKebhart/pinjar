// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useTranslation } from '@/src/i18n/context';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { addSavedLink, getSavedLinks, removeSavedLink } from '@/src/lib/storage';
import { EXPORT_FORMAT } from '@/src/lib/transfer';
import { DataSection } from './DataSection';

/** What the browser was handed to save, once the export ran. */
let downloaded: { blob: Blob; fileName: string; wasInDocument: boolean } | null = null;

/** Renders the section as the dashboard does, once it knows what is stored. */
async function renderSection(language = 'en-US'): Promise<void> {
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => language });

  render(
    <TranslationProvider>
      <LanguageToggle />
      <DataSection />
    </TranslationProvider>,
  );

  // Both the catalog and the stored data are read from storage, so the first
  // paint has neither text nor buttons yet.
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

async function saveOneLink(title = 'Jersey fabric'): Promise<void> {
  await addSavedLink({ url: 'https://shop.example/jersey', title });
}

function exportButton(): HTMLElement {
  return screen.getByRole('button', { name: /^(Export as a file|Als Datei exportieren)$/ });
}

function importButton(): HTMLElement {
  return screen.getByRole('button', { name: /^(Import a file|Datei importieren)$/ });
}

function deleteButton(): HTMLElement {
  return screen.getByRole('button', { name: /^(Delete all data|Alle Daten löschen)$/ });
}

/**
 * The message shown with a button. Each action reports directly below the
 * button that caused it, so this is also what proves it lands there.
 */
function noticeNear(button: HTMLElement): string {
  return button.parentElement?.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

/** Puts a file into the picker the way choosing one would. */
function chooseFile(contents: string): void {
  const input = filePicker();
  const file = new File([contents], 'wishlist.json', { type: 'application/json' });

  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

/**
 * The picker behind the import button. It carries no label of its own: it is
 * hidden from sight and from assistive technology, and the button in front of
 * it is what everything goes through.
 */
function filePicker(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');

  if (input === null) {
    throw new Error('the import file picker is missing from the document');
  }

  return input;
}

/** A file as the export half would have written it. */
function anExport(links: unknown[] = []): string {
  return JSON.stringify({
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: '2026-08-01T10:00:00.000Z',
    links,
    categories: [],
    tags: [],
    customStatuses: [],
  });
}

function aStoredLink(url: string, title: string): Record<string, unknown> {
  return {
    url,
    title,
    imageUrl: null,
    category: null,
    tags: [],
    status: { kind: 'builtin', key: 'default' },
    note: '',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
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
    await saveOneLink();
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloaded).not.toBeNull());
    expect(downloaded?.fileName).toMatch(/^pinjar-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('writes every saved link into it', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloaded).not.toBeNull());
    const written: unknown = JSON.parse(await (downloaded as { blob: Blob }).blob.text());
    expect(written).toMatchObject({
      format: EXPORT_FORMAT,
      links: [{ url: 'https://shop.example/jersey', title: 'Jersey fabric' }],
    });
  });

  /*
   * Firefox ignores a click on a link that is not part of the page, and the
   * export would fail there with nothing to show for it.
   */
  it('clicks a link that is part of the document', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(downloaded).not.toBeNull());
    expect(downloaded?.wasInDocument).toBe(true);
  });

  it('is not offered while there is nothing to write', async () => {
    await renderSection();

    expect(exportButton()).toHaveProperty('disabled', true);
    expect(screen.getByText(/nothing to export/i)).toBeTruthy();
    expect(screen.queryByText(/not encrypted/i)).toBeNull();
  });

  // The section is read from storage rather than handed down, so it has to
  // notice a link saved from the popup while this tab stays open.
  it('becomes possible as soon as something is saved', async () => {
    await renderSection();

    await saveOneLink();

    await waitFor(() => expect(exportButton()).toHaveProperty('disabled', false));
    expect(screen.getByText(/not encrypted/i)).toBeTruthy();
  });
});

describe('importing', () => {
  /*
   * Left to the browser's own control, the way in would be a native button
   * that Tailwind's reset draws as plain text and that never speaks the
   * language the dashboard was switched to.
   */
  it('opens the picker from a button of its own', async () => {
    await renderSection();
    const opened = vi.fn();
    filePicker().addEventListener('click', opened);

    fireEvent.click(importButton());

    expect(opened).toHaveBeenCalledOnce();
  });

  // Which is exactly when a file is most likely to be waiting.
  it('is offered even with an empty wishlist', async () => {
    await renderSection();

    expect(importButton()).toHaveProperty('disabled', false);
  });

  it('adds what the file holds and says how many', async () => {
    await renderSection();

    chooseFile(anExport([aStoredLink('https://shop.example/jersey', 'Jersey fabric')]));

    await waitFor(() => expect(noticeNear(importButton())).toContain('1 link added.'));
    await expect(getSavedLinks()).resolves.toMatchObject([{ title: 'Jersey fabric' }]);
  });

  it('mentions the ones that were already saved', async () => {
    await saveOneLink('Mine');
    await renderSection();

    chooseFile(anExport([aStoredLink('https://shop.example/jersey', 'Theirs')]));

    await waitFor(() =>
      expect(noticeNear(importButton())).toContain('1 was already on your list.'),
    );
  });

  it('mentions the entries it could not read', async () => {
    await renderSection();

    chooseFile(anExport([aStoredLink('chrome://extensions', 'Not saveable')]));

    await waitFor(() =>
      expect(noticeNear(importButton())).toContain('could not be read and was skipped'),
    );
  });

  // A wrong file is a normal mistake, so the message has to say what to do.
  it.each([
    ['a file that is not JSON', 'not a file', 'That file could not be read'],
    ['JSON from somewhere else', '{"bookmarks":[]}', 'not a PinJar export'],
  ])('explains %s', async (_case, contents, expected) => {
    await renderSection();

    chooseFile(contents);

    await waitFor(() => expect(noticeNear(importButton())).toContain(expected));
    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  // Picking the same file twice fires no second change event unless the
  // picker is cleared, and nothing would appear to happen.
  it('can be given the same file twice', async () => {
    await renderSection();
    const file = anExport([aStoredLink('https://shop.example/jersey', 'Jersey fabric')]);

    chooseFile(file);
    await waitFor(() => expect(noticeNear(importButton())).toContain('1 link added.'));
    chooseFile(file);

    await waitFor(() =>
      expect(noticeNear(importButton())).toContain('1 was already on your list.'),
    );
  });

  it('leaves the export possible once a file has brought links in', async () => {
    await renderSection();

    chooseFile(anExport([aStoredLink('https://shop.example/jersey', 'Jersey fabric')]));

    await waitFor(() => expect(exportButton()).toHaveProperty('disabled', false));
  });

  it('reports in German too', async () => {
    await renderSection('de-DE');

    chooseFile(anExport([aStoredLink('https://shop.example/jersey', 'Jersey fabric')]));

    await waitFor(() => expect(noticeNear(importButton())).toContain('1 Link hinzugefügt.'));
  });
});

describe('deleting everything', () => {
  it('asks before it does anything', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(deleteButton());

    expect(screen.getByRole('button', { name: 'Yes, delete everything' })).toBeTruthy();
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  // Nothing brings the data back, so the warning has to say so.
  it('says what goes and that it cannot be undone', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(deleteButton());

    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
  });

  /*
   * The warning is the only safeguard there is, and it appears where the
   * button just was. Without focus following it, it is never read out and a
   * keyboard user has to tab in from the top of the page to answer it. It is
   * the question's description rather than its name, so the name stays short
   * enough to answer — both are read out on arrival.
   */
  it('hands focus to the question, which carries the warning as its description', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(deleteButton());

    const question = screen.getByRole('group', { name: /really delete all data/i });

    expect(document.activeElement).toBe(question);
    expect(question.getAttribute('aria-describedby')).toBe(
      screen.getByText(/cannot be undone/i).id,
    );
  });

  it('hands focus back to the button when the question is dismissed', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(document.activeElement).toBe(deleteButton());
  });

  it('removes everything once confirmed', async () => {
    await addSavedLink({
      url: 'https://shop.example/jersey',
      title: 'Jersey fabric',
      category: 'Fabrics',
    });
    await renderSection();

    fireEvent.click(deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete everything' }));

    await waitFor(() => expect(noticeNear(deleteButton())).toContain('All data deleted.'));
    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  it('keeps everything when the question is dismissed', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(deleteButton());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleteButton()).toBeTruthy();
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  it('is not offered when there is nothing at all to delete', async () => {
    await renderSection();

    expect(deleteButton()).toHaveProperty('disabled', true);
  });

  /*
   * Categories, tags and status values outlive the links that used them. The
   * right to clear everything must not depend on the list looking empty
   * (docs/concept.md §7.3).
   */
  it('is still offered when only remembered values are left', async () => {
    const link = await addSavedLink({ url: 'https://shop.example/jersey', category: 'Fabrics' });
    await removeSavedLink(link?.id ?? '');
    await renderSection();

    expect(exportButton()).toHaveProperty('disabled', true);
    expect(deleteButton()).toHaveProperty('disabled', false);
  });
});

describe('the messages', () => {
  it('appear below the button that caused them, and nowhere else', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(noticeNear(exportButton())).toContain('your browser is saving'));
    expect(noticeNear(importButton())).toBe('');
    expect(noticeNear(deleteButton())).toBe('');
  });

  it('stay away until there is something to say', async () => {
    await saveOneLink();
    await renderSection();

    expect(noticeNear(exportButton())).toBe('');
    expect(noticeNear(importButton())).toBe('');
  });

  /*
   * Kept as a key rather than as finished text: a sentence built in German
   * would otherwise still be standing there in German after the dashboard was
   * switched to English (docs/concept.md §3.7).
   */
  it('change language along with the interface', async () => {
    await saveOneLink();
    await renderSection('de-DE');

    fireEvent.click(exportButton());
    await waitFor(() =>
      expect(noticeNear(exportButton())).toContain('dein Browser speichert die Datei'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'switch to English' }));

    await waitFor(() =>
      expect(noticeNear(exportButton())).toContain('your browser is saving the file'),
    );
  });

  // Its border says how it went in color alone, which not everyone can see;
  // the glyph in front of it says the same thing in shape.
  it('carry a marker that is seen but not read out', async () => {
    await saveOneLink();
    await renderSection();

    fireEvent.click(exportButton());

    await waitFor(() => expect(noticeNear(exportButton())).toContain('✓'));
    expect(screen.getByText('✓').getAttribute('aria-hidden')).toBe('true');
  });

  it('mark a refused file apart from a successful action', async () => {
    await renderSection();

    chooseFile('not a file');

    await waitFor(() =>
      expect(noticeNear(importButton())).toContain('That file could not be read'),
    );
    expect(screen.getByText('!').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByText('✓')).toBeNull();
  });
});

describe('the German interface', () => {
  it('translates the whole section', async () => {
    await saveOneLink();
    await renderSection('de-DE');

    expect(screen.getByText(/unverschlüsselt/i)).toBeTruthy();
    expect(importButton()).toBeTruthy();
    expect(deleteButton()).toBeTruthy();
  });

  it('translates the empty case too', async () => {
    await renderSection('de-DE');

    expect(screen.getByText(/nichts zu exportieren/i)).toBeTruthy();
  });
});
