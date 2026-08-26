import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_STATUS, type SavedLink } from './saved-link';
import { languagePreference } from './settings';
import {
  savedLinks,
  addSavedLink,
  categories,
  countSavedLinksForDomain,
  deleteAllSavedData,
  findSavedLinkByUrl,
  getCategories,
  getCustomStatuses,
  getSavedLinks,
  getSavedLinksForDomain,
  deleteOrganizationValue,
  getOrganizationValues,
  getTags,
  removeSavedLink,
  renameOrganizationValue,
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

describe('editing the values links are organized by', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('lists what is remembered, with how many links carry it', async () => {
    await save('https://shop.example/one', { category: 'Fabrics' });
    await save('https://shop.example/two', { category: 'Fabrics' });
    await save('https://shop.example/three', { category: 'Recipes' });

    await expect(getOrganizationValues('category')).resolves.toEqual([
      { value: 'Fabrics', usage: 2 },
      { value: 'Recipes', usage: 1 },
    ]);
  });

  it('lists a value nothing carries any more', async () => {
    const link = await save('https://shop.example/one', { tags: ['Sale'] });

    await removeSavedLink(link.id);

    await expect(getOrganizationValues('tag')).resolves.toEqual([{ value: 'Sale', usage: 0 }]);
  });

  // Otherwise it could be neither renamed nor deleted, and would sit on the
  // links for good.
  it('lists a value the remembered list has lost', async () => {
    await save('https://shop.example/one', { category: 'Fabrics' });
    await categories.setValue([]);

    await expect(getOrganizationValues('category')).resolves.toEqual([
      { value: 'Fabrics', usage: 1 },
    ]);
  });

  it('renames a value on the links and in what is remembered', async () => {
    const link = await save('https://shop.example/one', { category: 'Fabric' });

    const outcome = await renameOrganizationValue('category', 'Fabric', 'Fabrics');

    expect(outcome).toEqual({ affected: 1, merged: false });
    await expect(getCategories()).resolves.toEqual(['Fabrics']);
    expect((await getSavedLinks()).find((each) => each.id === link.id)?.category).toBe('Fabrics');
  });

  it('trims the new name, as saving a link would', async () => {
    await save('https://shop.example/one', { category: 'Fabric' });

    await renameOrganizationValue('category', 'Fabric', '  Fabrics  ');

    await expect(getCategories()).resolves.toEqual(['Fabrics']);
  });

  /*
   * Renaming onto a name already in use merges the two — usually the same thing
   * typed twice, once with a slip. The outcome says so, because that is more
   * than the user asked for and they should be told.
   */
  it('merges into an existing value and says that it did', async () => {
    await save('https://shop.example/one', { tags: ['sale'] });
    await save('https://shop.example/two', { tags: ['Sale'] });

    const outcome = await renameOrganizationValue('tag', 'sale', 'Sale');

    expect(outcome).toEqual({ affected: 1, merged: true });
    await expect(getTags()).resolves.toEqual(['Sale']);
  });

  it('refuses a blank name, an unchanged one, and a value it does not know', async () => {
    await save('https://shop.example/one', { category: 'Fabrics' });

    await expect(renameOrganizationValue('category', 'Fabrics', '   ')).resolves.toBeNull();
    await expect(renameOrganizationValue('category', 'Fabrics', 'Fabrics')).resolves.toBeNull();
    await expect(renameOrganizationValue('category', 'Recipes', 'Cooking')).resolves.toBeNull();
    await expect(getCategories()).resolves.toEqual(['Fabrics']);
  });

  it('deletes a value from the links and from what is remembered', async () => {
    await save('https://shop.example/one', { tags: ['Sale', 'Wool'] });

    await expect(deleteOrganizationValue('tag', 'Sale')).resolves.toBe(1);

    await expect(getTags()).resolves.toEqual(['Wool']);
    expect((await getSavedLinks())[0]?.tags).toEqual(['Wool']);
  });

  // Deleting a category is not a way to delete what was filed under it.
  it('keeps every link when a value goes', async () => {
    await save('https://shop.example/one', { category: 'Fabrics' });

    await deleteOrganizationValue('category', 'Fabrics');

    const links = await getSavedLinks();
    expect(links).toHaveLength(1);
    expect(links[0]?.category).toBeNull();
  });

  it('deletes a value nothing carries any more', async () => {
    await save('https://shop.example/one', { category: 'Fabrics' });
    await categories.setValue(['Fabrics', 'Recipes']);

    await expect(deleteOrganizationValue('category', 'Recipes')).resolves.toBe(0);

    await expect(getCategories()).resolves.toEqual(['Fabrics']);
  });
});
