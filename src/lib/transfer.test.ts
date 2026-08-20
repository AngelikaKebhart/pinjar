import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { addSavedLink } from './storage';
import { buildExportFile, EXPORT_FORMAT, EXPORT_VERSION, exportFileName } from './transfer';

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
