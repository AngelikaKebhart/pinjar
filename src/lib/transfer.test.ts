import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_STATUS } from './saved-link';
import { addSavedLink, getCategories, getCustomStatuses, getSavedLinks, getTags } from './storage';
import {
  buildExportFile,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  exportFileName,
  importFile,
} from './transfer';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('the export file', () => {
  it('holds every saved link', async () => {
    await addSavedLink({ url: 'https://shop.example/jersey', title: 'Jersey fabric' });
    await addSavedLink({ url: 'https://blog.example/post', title: 'A pattern' });

    const file = await buildExportFile();

    expect(file.links.map((link) => link.title)).toEqual(['A pattern', 'Jersey fabric']);
  });

  it('keeps everything a link was given', async () => {
    await addSavedLink({
      url: 'https://shop.example/jersey',
      title: 'Jersey fabric',
      imageUrl: 'https://shop.example/jersey.png',
      category: 'Fabrics',
      tags: ['Cotton', 'Blue'],
      status: { kind: 'custom', label: 'Bought' },
      note: 'Two metres',
    });

    const [link] = (await buildExportFile()).links;

    expect(link).toMatchObject({
      url: 'https://shop.example/jersey',
      domain: 'shop.example',
      title: 'Jersey fabric',
      imageUrl: 'https://shop.example/jersey.png',
      category: 'Fabrics',
      tags: ['Cotton', 'Blue'],
      status: { kind: 'custom', label: 'Bought' },
      note: 'Two metres',
    });
  });

  /*
   * The suggestion lists are stored beside the links (docs/concept.md §4), so
   * they have to travel beside them too. A category created but not yet used
   * would otherwise not survive the move to another browser.
   */
  it('carries the suggestion lists as well', async () => {
    await addSavedLink({
      url: 'https://shop.example/jersey',
      title: 'Jersey fabric',
      category: 'Fabrics',
      tags: ['Cotton'],
      status: { kind: 'custom', label: 'Bought' },
    });

    const file = await buildExportFile();

    expect(file).toMatchObject({
      categories: ['Fabrics'],
      tags: ['Cotton'],
      customStatuses: ['Bought'],
    });
  });

  // Without these two a reader has no way to tell this file from any other
  // JSON, nor to notice that it was written by a version it does not know.
  it('says what it is and which version wrote it', async () => {
    const file = await buildExportFile();

    expect(file).toMatchObject({ format: EXPORT_FORMAT, version: EXPORT_VERSION });
  });

  it('records when it was written', async () => {
    const before = Date.now();

    const { exportedAt } = await buildExportFile();

    expect(Date.parse(exportedAt)).toBeGreaterThanOrEqual(before);
  });

  // An empty wishlist is a normal state, and exporting it must not produce a
  // file the reader would later have to treat as broken.
  it('is complete even with nothing saved', async () => {
    const file = await buildExportFile();

    expect(file).toMatchObject({ links: [], categories: [], tags: [], customStatuses: [] });
  });
});

describe('the file name', () => {
  it('names the extension and the day', () => {
    expect(exportFileName(new Date(2026, 7, 20, 14, 30))).toBe(
      'universal-wishlist-2026-08-20.json',
    );
  });

  it('pads month and day so the names sort by date', () => {
    expect(exportFileName(new Date(2026, 0, 5, 14, 30))).toBe('universal-wishlist-2026-01-05.json');
  });
});

/** A file as this extension would have written it, holding the given links. */
function anExport(links: unknown[] = [], extras: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: '2026-08-01T10:00:00.000Z',
    links,
    categories: [],
    tags: [],
    customStatuses: [],
    ...extras,
  });
}

/** One link as it appears inside such a file. */
function aStoredLink(url: string, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'an-id-from-another-browser',
    url,
    domain: 'shop.example',
    title: 'Jersey fabric',
    imageUrl: null,
    category: null,
    tags: [],
    status: DEFAULT_STATUS,
    note: '',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...extras,
  };
}

describe('reading a file back in', () => {
  it('adds the links it holds', async () => {
    const outcome = await importFile(anExport([aStoredLink('https://shop.example/jersey')]));

    expect(outcome).toEqual({ status: 'imported', added: 1, duplicates: 0, unusable: 0 });
    await expect(getSavedLinks()).resolves.toMatchObject([{ url: 'https://shop.example/jersey' }]);
  });

  it('keeps what the file said about them', async () => {
    const stored = aStoredLink('https://shop.example/jersey', {
      imageUrl: 'https://shop.example/jersey.png',
      category: 'Fabrics',
      tags: ['Cotton'],
      status: { kind: 'custom', label: 'Bought' },
      note: 'Two metres',
    });

    await importFile(anExport([stored]));

    await expect(getSavedLinks()).resolves.toMatchObject([
      {
        title: 'Jersey fabric',
        imageUrl: 'https://shop.example/jersey.png',
        category: 'Fabrics',
        tags: ['Cotton'],
        status: { kind: 'custom', label: 'Bought' },
        note: 'Two metres',
        createdAt: '2026-07-01T10:00:00.000Z',
      },
    ]);
  });

  /*
   * The file is a copy from another browser, not the truth about this one. An
   * entry the user has since given a note here must not be thrown away by an
   * older idea of itself.
   */
  it('leaves a link that is already saved exactly as it is', async () => {
    await addSavedLink({ url: 'https://shop.example/jersey', title: 'Mine', note: 'Ordered' });

    const outcome = await importFile(
      anExport([aStoredLink('https://shop.example/jersey', { title: 'Theirs' })]),
    );

    expect(outcome).toMatchObject({ added: 0, duplicates: 1 });
    await expect(getSavedLinks()).resolves.toMatchObject([{ title: 'Mine', note: 'Ordered' }]);
  });

  it('carries the suggestion lists over', async () => {
    await importFile(
      anExport([], { categories: ['Fabrics'], tags: ['Cotton'], customStatuses: ['Bought'] }),
    );

    await expect(getCategories()).resolves.toEqual(['Fabrics']);
    await expect(getTags()).resolves.toEqual(['Cotton']);
    await expect(getCustomStatuses()).resolves.toEqual(['Bought']);
  });

  it('does not end up offering a suggestion twice', async () => {
    await addSavedLink({ url: 'https://shop.example/jersey', category: 'Fabrics' });

    await importFile(anExport([], { categories: ['Fabrics', 'Patterns'] }));

    await expect(getCategories()).resolves.toEqual(['Fabrics', 'Patterns']);
  });

  it('sorts what it added in among what was here, newest first', async () => {
    await addSavedLink({ url: 'https://shop.example/newer' });
    const older = aStoredLink('https://shop.example/older', {
      createdAt: '2020-01-01T10:00:00.000Z',
    });

    await importFile(anExport([older]));

    const urls = (await getSavedLinks()).map((link) => link.url);
    expect(urls).toEqual(['https://shop.example/newer', 'https://shop.example/older']);
  });

  /*
   * Ids only ever mean something inside one browser, so a file's id could
   * collide with an entry that is already here.
   */
  it('gives an imported link an id of its own', async () => {
    await importFile(anExport([aStoredLink('https://shop.example/jersey')]));

    const [link] = await getSavedLinks();
    expect(link?.id).not.toBe('an-id-from-another-browser');
  });
});

describe('a file that cannot be trusted', () => {
  it.each([
    ['is not JSON at all', 'not a file', 'notReadable'],
    ['is JSON from somewhere else', '{"bookmarks":[]}', 'notOurFormat'],
  ])('is refused when it %s', async (_case, contents, problem) => {
    await expect(importFile(contents)).resolves.toEqual({ status: 'failed', problem });
    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  /*
   * A newer file may hold fields this build knows nothing about. Reading it
   * half-way would drop them without a word.
   */
  it('is refused when it comes from a newer version', async () => {
    const fromTheFuture = anExport([aStoredLink('https://shop.example/jersey')], {
      version: EXPORT_VERSION + 1,
    });

    await expect(importFile(fromTheFuture)).resolves.toEqual({
      status: 'failed',
      problem: 'tooNew',
    });
    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  it('skips an entry with no address to file it under, and counts it', async () => {
    const outcome = await importFile(
      anExport([
        aStoredLink('https://shop.example/jersey'),
        aStoredLink('chrome://extensions'),
        { title: 'No url at all' },
      ]),
    );

    expect(outcome).toMatchObject({ added: 1, unusable: 2 });
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  /*
   * A hand-edited file is the one way an unsafe image URL could reach the
   * dashboard, where it would be rendered. The link is still worth keeping,
   * so only the image is dropped (docs/concept.md §7.4).
   */
  it('drops an unsafe image but keeps the link', async () => {
    const withScriptImage = aStoredLink('https://shop.example/jersey', {
      imageUrl: 'javascript:alert(1)',
    });

    await importFile(anExport([withScriptImage]));

    await expect(getSavedLinks()).resolves.toMatchObject([{ imageUrl: null }]);
  });

  it('reads a status it does not recognize as the built-in one', async () => {
    const invented = aStoredLink('https://shop.example/jersey', { status: { kind: 'invented' } });

    await importFile(anExport([invented]));

    await expect(getSavedLinks()).resolves.toMatchObject([{ status: DEFAULT_STATUS }]);
  });

  it('replaces fields of the wrong type rather than storing them', async () => {
    const nonsense = aStoredLink('https://shop.example/jersey', {
      title: 42,
      tags: ['Cotton', 7, null],
      note: { text: 'nope' },
      createdAt: 'not a date',
    });

    await importFile(anExport([nonsense]));

    const [link] = await getSavedLinks();
    expect(link).toMatchObject({ title: 'shop.example', tags: ['Cotton'], note: '' });
    expect(Number.isNaN(Date.parse(link?.createdAt ?? ''))).toBe(false);
  });
});

/*
 * The two halves have to fit each other: a file this extension wrote is the
 * only file it promises to read.
 */
describe('a file this extension wrote itself', () => {
  async function saveOneLink(): Promise<void> {
    await addSavedLink({
      url: 'https://shop.example/jersey',
      title: 'Jersey fabric',
      category: 'Fabrics',
      tags: ['Cotton'],
      status: { kind: 'custom', label: 'Bought' },
      note: 'Two metres',
    });
  }

  it('is read back without adding anything twice', async () => {
    await saveOneLink();
    const file = JSON.stringify(await buildExportFile(), null, 2);

    await expect(importFile(file)).resolves.toEqual({
      status: 'imported',
      added: 0,
      duplicates: 1,
      unusable: 0,
    });
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  // The reason to keep a copy at all: getting everything back.
  it('brings everything back after everything was deleted', async () => {
    await saveOneLink();
    const file = JSON.stringify(await buildExportFile(), null, 2);

    fakeBrowser.reset();
    await importFile(file);

    await expect(getSavedLinks()).resolves.toMatchObject([
      {
        title: 'Jersey fabric',
        category: 'Fabrics',
        tags: ['Cotton'],
        status: { kind: 'custom', label: 'Bought' },
        note: 'Two metres',
      },
    ]);
    await expect(getCategories()).resolves.toEqual(['Fabrics']);
    await expect(getCustomStatuses()).resolves.toEqual(['Bought']);
  });
});
