import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_STATUS, type SavedLink } from './saved-link';
import { languagePreference } from './settings';
import {
  savedLinks,
  addSavedLink,
  countSavedLinksForDomain,
  deleteAllSavedData,
  findSavedLinkByUrl,
  getCategories,
  getCustomStatuses,
  getSavedLinks,
  getSavedLinksForDomain,
  getTags,
  removeSavedLink,
  updateSavedLink,
} from './storage';

async function save(url: string, draft: { category?: string; tags?: string[] } = {}) {
  const link = await addSavedLink({ url, title: 'Saved page', ...draft });
  if (link === null) {
    throw new Error(`Expected ${url} to be storable`);
  }
  return link;
}

describe('saved links', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('starts empty', async () => {
    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  it('keeps a saved link', async () => {
    const link = await save('https://shop.example/item');

    await expect(getSavedLinks()).resolves.toEqual([link]);
  });

  // The popup and the dashboard show the most recent find first, and nothing
  // re-sorts afterwards — so the order has to be right in storage already.
  it('lists the newest link first', async () => {
    const first = await save('https://shop.example/first');
    const second = await save('https://shop.example/second');

    await expect(getSavedLinks()).resolves.toEqual([second, first]);
  });

  it('stores nothing for a page that cannot be saved', async () => {
    await expect(addSavedLink({ url: 'chrome://extensions' })).resolves.toBeNull();

    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  // Renaming the key would make every saved link of existing users disappear.
  it('stores the links under a stable key', async () => {
    const link = await save('https://shop.example/item');

    await expect(fakeBrowser.storage.local.get('savedLinks')).resolves.toEqual({
      savedLinks: [link],
    });
  });

  // This is how the background worker learns that the badge needs updating.
  it('notifies watchers about a new link', async () => {
    const seen: SavedLink[][] = [];
    const unwatch = savedLinks.watch((links) => seen.push(links));

    const link = await save('https://shop.example/item');
    unwatch();
    await save('https://shop.example/unwatched');

    expect(seen).toEqual([[link]]);
  });
});

describe('links of the visited domain', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns only what was saved on that domain', async () => {
    const wanted = await save('https://shop.example/item');
    await save('https://other.example/item');

    await expect(getSavedLinksForDomain('shop.example')).resolves.toEqual([wanted]);
  });

  it('counts them for the badge', async () => {
    await save('https://shop.example/first');
    await save('https://shop.example/second');
    await save('https://other.example/item');

    await expect(countSavedLinksForDomain('shop.example')).resolves.toBe(2);
    await expect(countSavedLinksForDomain('unvisited.example')).resolves.toBe(0);
  });

  it('finds a link by its exact URL so the popup can tell it is already saved', async () => {
    const link = await save('https://shop.example/item');

    await expect(findSavedLinkByUrl('https://shop.example/item')).resolves.toEqual(link);
    await expect(findSavedLinkByUrl('https://shop.example/other')).resolves.toBeNull();
  });
});

describe('editing and deleting', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores an edit', async () => {
    const link = await save('https://shop.example/item');

    const updated = await updateSavedLink(link.id, { note: 'Size M' });

    expect(updated?.note).toBe('Size M');
    await expect(getSavedLinks()).resolves.toEqual([updated]);
  });

  it('leaves the other links untouched', async () => {
    const first = await save('https://shop.example/first');
    const second = await save('https://shop.example/second');

    await updateSavedLink(second.id, { note: 'Size M' });

    await expect(getSavedLinks()).resolves.toMatchObject([{ id: second.id }, first]);
  });

  // Happens when the same link was deleted in another tab meanwhile.
  it('reports an edit of a link that no longer exists', async () => {
    await expect(updateSavedLink('gone', { note: 'Size M' })).resolves.toBeNull();
  });

  it('deletes a single link', async () => {
    const kept = await save('https://shop.example/keep');
    const removed = await save('https://shop.example/remove');

    await removeSavedLink(removed.id);

    await expect(getSavedLinks()).resolves.toEqual([kept]);
  });

  it('ignores deleting something that is already gone', async () => {
    const kept = await save('https://shop.example/keep');

    await removeSavedLink('gone');

    await expect(getSavedLinks()).resolves.toEqual([kept]);
  });
});

describe('remembered categories, tags and statuses', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('remembers what a saved link uses', async () => {
    await addSavedLink({
      url: 'https://shop.example/item',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
      status: { kind: 'custom', label: 'Bought' },
    });

    await expect(getCategories()).resolves.toEqual(['Fabrics']);
    await expect(getTags()).resolves.toEqual(['jersey', 'blue']);
    await expect(getCustomStatuses()).resolves.toEqual(['Bought']);
  });

  it('remembers what an edit introduces', async () => {
    const link = await save('https://shop.example/item');

    await updateSavedLink(link.id, { category: 'Patterns', tags: ['dress'] });

    await expect(getCategories()).resolves.toEqual(['Patterns']);
    await expect(getTags()).resolves.toEqual(['dress']);
  });

  it('lists every value once, however often it is used', async () => {
    await save('https://shop.example/first', { category: 'Fabrics', tags: ['jersey'] });
    await save('https://shop.example/second', { category: 'Fabrics', tags: ['jersey', 'blue'] });

    await expect(getCategories()).resolves.toEqual(['Fabrics']);
    await expect(getTags()).resolves.toEqual(['jersey', 'blue']);
  });

  // The built-in status is always offered and is stored as a language-neutral
  // key; putting it in the custom list would offer it twice and, worse, in
  // whichever language it was saved in.
  it('does not treat the built-in status as one the user created', async () => {
    await addSavedLink({ url: 'https://shop.example/item', status: DEFAULT_STATUS });

    await expect(getCustomStatuses()).resolves.toEqual([]);
  });

  // Deleting the last link of a category is not a statement about the category.
  it('keeps a value offered after the last link using it is gone', async () => {
    const link = await save('https://shop.example/item', { category: 'Fabrics' });

    await removeSavedLink(link.id);

    await expect(getCategories()).resolves.toEqual(['Fabrics']);
  });
});

describe('deleting all data', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('leaves nothing of the saved links behind', async () => {
    await save('https://shop.example/item', { category: 'Fabrics', tags: ['jersey'] });

    await deleteAllSavedData();

    await expect(getSavedLinks()).resolves.toEqual([]);
    await expect(getCategories()).resolves.toEqual([]);
    await expect(getTags()).resolves.toEqual([]);
    await expect(getCustomStatuses()).resolves.toEqual([]);
  });

  // The language is a preference, not data the user asked to get rid of — an
  // interface flipping to another language is a confusing deletion receipt.
  it('keeps the chosen interface language', async () => {
    await languagePreference.setValue('de');

    await deleteAllSavedData();

    await expect(languagePreference.getValue()).resolves.toBe('de');
  });
});
