import { describe, expect, it } from 'vitest';
import { NO_FILTER, filterSavedLinks, isFiltering, type LinkFilterCriteria } from './filter';
import { DEFAULT_STATUS, type LinkStatus, type SavedLink } from './saved-link';

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
    status: DEFAULT_STATUS,
    note: '',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

function titlesMatching(links: SavedLink[], criteria: Partial<LinkFilterCriteria>): string[] {
  return filterSavedLinks(links, { ...NO_FILTER, ...criteria }).map((link) => link.title);
}

const custom = (label: string): LinkStatus => ({ kind: 'custom', label });

describe('with nothing set', () => {
  it('keeps every link, in the order it was given', () => {
    const links = [aLink({ title: 'First' }), aLink({ title: 'Second' })];

    expect(titlesMatching(links, {})).toEqual(['First', 'Second']);
  });

  it('reports that nothing is being narrowed down', () => {
    expect(isFiltering(NO_FILTER)).toBe(false);
  });

  // Whitespace is not a search, and the dashboard must not claim it is.
  it('does not count blank search text as a filter', () => {
    expect(isFiltering({ ...NO_FILTER, search: '   ' })).toBe(false);
  });

  it.each([
    ['search text', { search: 'jersey' }],
    ['a category', { category: 'Fabrics' }],
    ['links without a category', { category: '' }],
    ['a tag', { tags: ['jersey'] }],
    ['a status', { status: 'builtin:default' }],
  ])('reports %s as narrowing things down', (_case, criteria) => {
    expect(isFiltering({ ...NO_FILTER, ...criteria })).toBe(true);
  });
});

describe('searching', () => {
  const links = [
    aLink({ title: 'Blue jersey fabric', note: 'Two metres' }),
    aLink({ title: 'Cotton poplin', note: 'Goes with the jersey' }),
    aLink({ title: 'Sewing pattern', note: '' }),
  ];

  it('finds a word in the title', () => {
    expect(titlesMatching(links, { search: 'poplin' })).toEqual(['Cotton poplin']);
  });

  it('finds a word in the note', () => {
    expect(titlesMatching(links, { search: 'metres' })).toEqual(['Blue jersey fabric']);
  });

  it('finds it in either', () => {
    expect(titlesMatching(links, { search: 'jersey' })).toEqual([
      'Blue jersey fabric',
      'Cotton poplin',
    ]);
  });

  it('ignores case', () => {
    expect(titlesMatching(links, { search: 'JERSEY' })).toHaveLength(2);
  });

  it('matches part of a word, so a plural still finds the singular', () => {
    expect(titlesMatching(links, { search: 'metre' })).toEqual(['Blue jersey fabric']);
  });

  it('ignores surrounding whitespace', () => {
    expect(titlesMatching(links, { search: '  poplin  ' })).toEqual(['Cotton poplin']);
  });

  it('finds nothing when nothing contains it', () => {
    expect(titlesMatching(links, { search: 'velvet' })).toEqual([]);
  });

  // Those have their own filters. Searching "Fabrics" must not drag in every
  // link that merely sits in that category.
  it('does not search the category, tags or domain', () => {
    const link = aLink({
      title: 'Something',
      category: 'Fabrics',
      tags: ['jersey'],
      domain: 'stoffe.example',
    });

    expect(titlesMatching([link], { search: 'Fabrics' })).toEqual([]);
    expect(titlesMatching([link], { search: 'jersey' })).toEqual([]);
    expect(titlesMatching([link], { search: 'stoffe' })).toEqual([]);
  });
});

describe('filtering by category', () => {
  const links = [
    aLink({ title: 'In fabrics', category: 'Fabrics' }),
    aLink({ title: 'In patterns', category: 'Patterns' }),
    aLink({ title: 'Uncategorised', category: null }),
  ];

  it('keeps only that category', () => {
    expect(titlesMatching(links, { category: 'Fabrics' })).toEqual(['In fabrics']);
  });

  // Otherwise links without a category could only ever be found by searching.
  it('can single out the links without one', () => {
    expect(titlesMatching(links, { category: '' })).toEqual(['Uncategorised']);
  });

  it('matches the name exactly rather than loosely', () => {
    expect(titlesMatching(links, { category: 'Fabric' })).toEqual([]);
  });
});

describe('filtering by tag', () => {
  const links = [
    aLink({ title: 'Both', tags: ['jersey', 'blue'] }),
    aLink({ title: 'One', tags: ['jersey'] }),
    aLink({ title: 'Neither', tags: ['cotton'] }),
  ];

  it('keeps the links carrying it', () => {
    expect(titlesMatching(links, { tags: ['jersey'] })).toEqual(['Both', 'One']);
  });

  // Picking a second tag has to narrow the result, not widen it.
  it('requires all of several tags', () => {
    expect(titlesMatching(links, { tags: ['jersey', 'blue'] })).toEqual(['Both']);
  });

  it('finds nothing when no link carries them all', () => {
    expect(titlesMatching(links, { tags: ['jersey', 'cotton'] })).toEqual([]);
  });
});

describe('filtering by status', () => {
  const links = [
    aLink({ title: 'Just saved', status: DEFAULT_STATUS }),
    aLink({ title: 'Bought', status: custom('Bought') }),
    aLink({ title: 'Ordered', status: custom('Ordered') }),
  ];

  it('keeps the links with the built-in status', () => {
    expect(titlesMatching(links, { status: 'builtin:default' })).toEqual(['Just saved']);
  });

  it('keeps the links with one particular custom status', () => {
    expect(titlesMatching(links, { status: 'custom:Bought' })).toEqual(['Bought']);
  });

  // The kind is part of the key, so these two can never be confused.
  it('tells a custom status apart from the built-in one of the same name', () => {
    const withCustomDefault = aLink({ title: 'Custom', status: custom('default') });
    const withBuiltin = aLink({ title: 'Built-in', status: DEFAULT_STATUS });

    expect(titlesMatching([withCustomDefault, withBuiltin], { status: 'custom:default' })).toEqual([
      'Custom',
    ]);
  });
});

describe('combining filters', () => {
  const links = [
    aLink({ title: 'Blue jersey', category: 'Fabrics', tags: ['jersey', 'blue'] }),
    aLink({ title: 'Red jersey', category: 'Fabrics', tags: ['jersey', 'red'] }),
    aLink({ title: 'Blue pattern', category: 'Patterns', tags: ['blue'] }),
  ];

  it('narrows with each one added', () => {
    expect(titlesMatching(links, { category: 'Fabrics' })).toHaveLength(2);
    expect(titlesMatching(links, { category: 'Fabrics', tags: ['blue'] })).toEqual(['Blue jersey']);
  });

  it('applies search and filters together', () => {
    expect(titlesMatching(links, { search: 'jersey', tags: ['blue'] })).toEqual(['Blue jersey']);
  });

  it('can end up with nothing at all', () => {
    expect(titlesMatching(links, { category: 'Patterns', tags: ['jersey'] })).toEqual([]);
  });

  it('leaves the given list untouched', () => {
    const original = [...links];

    filterSavedLinks(links, { ...NO_FILTER, search: 'jersey' });

    expect(links).toEqual(original);
  });
});
