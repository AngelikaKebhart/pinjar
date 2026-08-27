import { describe, expect, it } from 'vitest';
import { countUsage, countUsageOf, removeValueFromLinks, renameValueInLinks } from './organization';
import type { SavedLink } from './saved-link';

let nextId = 0;

function aLink(overrides: Partial<SavedLink> = {}): SavedLink {
  nextId += 1;

  return {
    id: `link-${nextId}`,
    url: 'https://shop.example/item',
    domain: 'shop.example',
    title: 'Jersey fabric',
    imageUrl: null,
    category: null,
    tags: [],
    status: null,
    note: '',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('counting what a value is used by', () => {
  it('counts a category once per link', () => {
    const links = [aLink({ category: 'Fabrics' }), aLink({ category: 'Fabrics' }), aLink()];

    expect(countUsage(links, 'category')).toEqual(new Map([['Fabrics', 2]]));
  });

  it('counts every tag a link carries', () => {
    const links = [aLink({ tags: ['Sale', 'Wool'] }), aLink({ tags: ['Sale'] })];

    expect(countUsage(links, 'tag')).toEqual(
      new Map([
        ['Sale', 2],
        ['Wool', 1],
      ]),
    );
  });

  // A link without a status carries no value to count, exactly as one without
  // a category does.
  it('counts the statuses in use and skips the links without one', () => {
    const links = [aLink({ status: 'Bought' }), aLink(), aLink()];

    expect(countUsage(links, 'status')).toEqual(new Map([['Bought', 1]]));
  });

  it('leaves a value nothing uses out rather than counting it as zero', () => {
    expect(countUsage([aLink()], 'category').has('Fabrics')).toBe(false);
    expect(countUsageOf([aLink()], 'category', 'Fabrics')).toBe(0);
  });
});

describe('renaming a value', () => {
  it('rewrites the category of every link carrying it', () => {
    const links = [aLink({ category: 'Fabric' }), aLink({ category: 'Recipes' })];

    const renamed = renameValueInLinks(links, 'category', 'Fabric', 'Fabrics');

    expect(renamed.map((link) => link.category)).toEqual(['Fabrics', 'Recipes']);
  });

  it('rewrites a tag wherever it appears', () => {
    const links = [aLink({ tags: ['sale', 'Wool'] })];

    expect(renameValueInLinks(links, 'tag', 'sale', 'Sale')[0]?.tags).toEqual(['Sale', 'Wool']);
  });

  // Renaming onto a tag the link already carries is a merge, and a link listing
  // the same tag twice would offer it twice in the form.
  it('leaves no duplicate behind when a tag is merged into another', () => {
    const links = [aLink({ tags: ['sale', 'Sale'] })];

    expect(renameValueInLinks(links, 'tag', 'sale', 'Sale')[0]?.tags).toEqual(['Sale']);
  });

  it('rewrites a status and leaves the links without one alone', () => {
    const links = [aLink({ status: 'Bougth' }), aLink()];

    const renamed = renameValueInLinks(links, 'status', 'Bougth', 'Bought');

    expect(renamed[0]?.status).toBe('Bought');
    expect(renamed[1]?.status).toBeNull();
  });

  /*
   * `updatedAt` says when the user last changed this link. Renaming a category
   * across the whole list is not that, and bumping it would rewrite the history
   * of every link that happened to be filed under it.
   */
  it('does not count as an edit to the link', () => {
    const links = [aLink({ category: 'Fabric', updatedAt: '2026-08-01T10:00:00.000Z' })];

    expect(renameValueInLinks(links, 'category', 'Fabric', 'Fabrics')[0]?.updatedAt).toBe(
      '2026-08-01T10:00:00.000Z',
    );
  });

  it('hands back untouched links as they were', () => {
    const untouched = aLink({ category: 'Recipes' });

    expect(renameValueInLinks([untouched], 'category', 'Fabric', 'Fabrics')[0]).toBe(untouched);
  });
});

describe('deleting a value', () => {
  it('leaves a link without a category rather than deleting the link', () => {
    const links = [aLink({ category: 'Fabrics', title: 'Jersey' })];

    const remaining = removeValueFromLinks(links, 'category', 'Fabrics');

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.category).toBeNull();
    expect(remaining[0]?.title).toBe('Jersey');
  });

  it('takes the tag off and keeps the others', () => {
    const links = [aLink({ tags: ['Sale', 'Wool'] })];

    expect(removeValueFromLinks(links, 'tag', 'Sale')[0]?.tags).toEqual(['Wool']);
  });

  // The link stays; it is simply no longer filed under any status.
  it('leaves the link without a status', () => {
    const links = [aLink({ status: 'Bought' })];

    expect(removeValueFromLinks(links, 'status', 'Bought')[0]?.status).toBeNull();
  });

  it('does not count as an edit to the link either', () => {
    const links = [aLink({ tags: ['Sale'], updatedAt: '2026-08-01T10:00:00.000Z' })];

    expect(removeValueFromLinks(links, 'tag', 'Sale')[0]?.updatedAt).toBe(
      '2026-08-01T10:00:00.000Z',
    );
  });
});
