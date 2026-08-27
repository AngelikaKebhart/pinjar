import { describe, expect, it } from 'vitest';
import {
  availableCategories,
  availableDomains,
  availableStatuses,
  availableTags,
  filterSavedLinks,
  isFiltering,
  NO_FILTER,
  type LinkFilterCriteria,
} from './filter';
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

function titlesMatching(links: SavedLink[], criteria: Partial<LinkFilterCriteria>): string[] {
  return filterSavedLinks(links, { ...NO_FILTER, ...criteria }).map((link) => link.title);
}

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
    ['a status', { status: 'Bought' }],
    ['links without a status', { status: '' }],
    ['a domain', { domain: 'shop.example' }],
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
    aLink({ title: 'Nothing yet', status: null }),
    aLink({ title: 'Bought', status: 'Bought' }),
    aLink({ title: 'Ordered', status: 'Ordered' }),
  ];

  it('keeps the links with one particular status', () => {
    expect(titlesMatching(links, { status: 'Bought' })).toEqual(['Bought']);
  });

  // The status is optional, so "without one" is a real thing to look for —
  // the same as it is for the category.
  it('keeps only the links without a status', () => {
    expect(titlesMatching(links, { status: '' })).toEqual(['Nothing yet']);
  });
});

describe('filtering by domain', () => {
  const links = [
    aLink({ title: 'From the shop', domain: 'shop.example' }),
    aLink({ title: 'Also from the shop', domain: 'shop.example' }),
    aLink({ title: 'From the blog', domain: 'blog.example' }),
  ];

  it('keeps only the links saved on that domain', () => {
    expect(titlesMatching(links, { domain: 'shop.example' })).toEqual([
      'From the shop',
      'Also from the shop',
    ]);
  });

  // A subdomain is a domain of its own; the badge counts it separately too.
  it('matches the hostname exactly rather than loosely', () => {
    expect(titlesMatching(links, { domain: 'example' })).toEqual([]);
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

  it('narrows a domain down by the other filters', () => {
    const acrossDomains = [
      aLink({ title: 'Shop jersey', domain: 'shop.example', tags: ['jersey'] }),
      aLink({ title: 'Shop cotton', domain: 'shop.example', tags: ['cotton'] }),
      aLink({ title: 'Blog jersey', domain: 'blog.example', tags: ['jersey'] }),
    ];

    expect(titlesMatching(acrossDomains, { domain: 'shop.example', tags: ['jersey'] })).toEqual([
      'Shop jersey',
    ]);
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

describe('what each filter is worth offering', () => {
  const links = [
    aLink({
      title: 'Blue jersey',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
      domain: 'shop.example',
    }),
    aLink({
      title: 'Red cotton',
      category: 'Fabrics',
      tags: ['cotton', 'red'],
      domain: 'shop.example',
    }),
    aLink({
      title: 'Dress pattern',
      category: 'Patterns',
      tags: ['dress'],
      status: 'Bought',
      domain: 'patterns.example',
    }),
    aLink({ title: 'Loose end', category: null, tags: [], domain: 'blog.example' }),
  ];

  const criteria = (overrides: Partial<LinkFilterCriteria> = {}) => ({
    ...NO_FILTER,
    ...overrides,
  });

  describe('categories', () => {
    it('offers all of them while nothing else is filtered', () => {
      expect(availableCategories(links, criteria()).names).toEqual(['Fabrics', 'Patterns']);
    });

    it('offers the "without a category" entry only when it would find something', () => {
      expect(availableCategories(links, criteria()).unset).toBe(true);
      expect(availableCategories(links, criteria({ tags: ['jersey'] })).unset).toBe(false);
    });

    it('narrows to the categories the other filters leave', () => {
      expect(availableCategories(links, criteria({ tags: ['dress'] })).names).toEqual(['Patterns']);
    });

    // Otherwise the dropdown would collapse to the one value already picked.
    it('ignores the category filter itself', () => {
      expect(availableCategories(links, criteria({ category: 'Fabrics' })).names).toEqual([
        'Fabrics',
        'Patterns',
      ]);
    });

    // A select whose value is missing from its options renders blank.
    it('keeps the picked category even when nothing else matches', () => {
      expect(
        availableCategories(links, criteria({ category: 'Fabrics', search: 'pattern' })).names,
      ).toContain('Fabrics');
    });

    it('keeps the "without a category" entry while it is picked', () => {
      expect(availableCategories(links, criteria({ category: '', search: 'jersey' })).unset).toBe(
        true,
      );
    });
  });

  describe('tags', () => {
    // The case this whole thing exists for.
    it('narrows to the tags used in the chosen category', () => {
      expect(availableTags(links, criteria({ category: 'Patterns' }))).toEqual(['dress']);
    });

    it('narrows to the tags left by the search', () => {
      expect(availableTags(links, criteria({ search: 'jersey' }))).toEqual(['jersey', 'blue']);
    });

    // Otherwise ticking one tag would clear the list and no second one could
    // ever be added.
    it('ignores the tag filter itself', () => {
      expect(availableTags(links, criteria({ tags: ['jersey'] }))).toContain('cotton');
    });

    // A tick box that vanished could never be unticked again.
    it('keeps a ticked tag even when nothing else matches', () => {
      expect(availableTags(links, criteria({ tags: ['jersey'], search: 'pattern' }))).toEqual([
        'dress',
        'jersey',
      ]);
    });
  });

  describe('domains', () => {
    it('lists each domain once, however many links carry it', () => {
      expect(availableDomains(links, criteria())).toEqual([
        'shop.example',
        'patterns.example',
        'blog.example',
      ]);
    });

    it('narrows to the domains the other filters leave', () => {
      expect(availableDomains(links, criteria({ category: 'Patterns' }))).toEqual([
        'patterns.example',
      ]);
    });

    // Otherwise the dropdown would collapse to the one value already picked.
    it('ignores the domain filter itself', () => {
      expect(availableDomains(links, criteria({ domain: 'shop.example' }))).toHaveLength(3);
    });

    // A select whose value is missing from its options renders blank.
    it('keeps the picked domain even when nothing else matches', () => {
      expect(
        availableDomains(links, criteria({ domain: 'shop.example', search: 'pattern' })),
      ).toContain('shop.example');
    });
  });

  describe('statuses', () => {
    it('offers only the ones actually in use, each of them once', () => {
      expect(availableStatuses(links, criteria()).names).toEqual(['Bought']);
    });

    it('offers the "without a status" entry only when it would find something', () => {
      expect(availableStatuses(links, criteria()).unset).toBe(true);
      expect(availableStatuses(links, criteria({ tags: ['dress'] })).unset).toBe(false);
    });

    it('narrows to the statuses the other filters leave', () => {
      expect(availableStatuses(links, criteria({ category: 'Fabrics' })).names).toEqual([]);
    });

    it('ignores the status filter itself', () => {
      expect(availableStatuses(links, criteria({ status: 'Bought' })).names).toEqual(['Bought']);
    });

    it('keeps the picked status even when nothing else matches', () => {
      expect(
        availableStatuses(links, criteria({ status: 'Bought', category: 'Fabrics' })).names,
      ).toContain('Bought');
    });

    it('keeps the "without a status" entry while it is picked', () => {
      expect(availableStatuses(links, criteria({ status: '', category: 'Patterns' })).unset).toBe(
        true,
      );
    });
  });
});
