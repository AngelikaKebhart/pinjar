import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATUS, applyEdits, createSavedLink, type SavedLink } from './saved-link';

/** Shorthand for the many cases that only care about one field. */
function createLink(draft: Partial<Parameters<typeof createSavedLink>[0]> = {}): SavedLink {
  const link = createSavedLink({ url: 'https://shop.example/item', ...draft });
  if (link === null) {
    throw new Error('Expected the draft to be storable');
  }
  return link;
}

describe('createSavedLink', () => {
  it('derives the domain and keeps the URL as given', () => {
    const link = createLink({ url: 'https://shop.example/item?variant=2#details' });

    expect(link.domain).toBe('shop.example');
    expect(link.url).toBe('https://shop.example/item?variant=2#details');
  });

  it('gives every link its own id', () => {
    expect(createLink().id).not.toBe(createLink().id);
  });

  it('starts a link out as merely saved, with nothing filled in', () => {
    const link = createLink();

    expect(link.status).toEqual(DEFAULT_STATUS);
    expect(link.category).toBeNull();
    expect(link.tags).toEqual([]);
    expect(link.note).toBe('');
    expect(link.imageUrl).toBeNull();
  });

  it('records creation and last change as the same moment', () => {
    const link = createLink();

    expect(link.createdAt).toBe(link.updatedAt);
    expect(Number.isNaN(Date.parse(link.createdAt))).toBe(false);
  });

  it('takes over what the user filled in while saving', () => {
    const link = createLink({
      title: 'Jersey fabric',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
      status: { kind: 'custom', label: 'Bought' },
      note: 'Two metres are enough',
      imageUrl: 'https://shop.example/preview.jpg',
    });

    expect(link).toMatchObject({
      title: 'Jersey fabric',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
      status: { kind: 'custom', label: 'Bought' },
      note: 'Two metres are enough',
      imageUrl: 'https://shop.example/preview.jpg',
    });
  });

  // A page the extension cannot file under a domain cannot be saved at all;
  // the popup turns this into a message instead of a broken entry.
  it.each([
    ['a browser page', 'chrome://extensions'],
    ['a local file', 'file:///C:/notes.html'],
    ['a script URL', 'javascript:alert(1)'],
    ['something that is no URL', 'not a url'],
  ])('refuses %s', (_case, url) => {
    expect(createSavedLink({ url })).toBeNull();
  });

  describe('when the page gave us little to work with', () => {
    it.each([
      ['no title at all', undefined],
      ['an empty title', ''],
      ['a title of only whitespace', '   '],
    ])('falls back to the domain given %s', (_case, title) => {
      expect(createLink({ title }).title).toBe('shop.example');
    });

    it('trims a usable title', () => {
      expect(createLink({ title: '  Jersey fabric  ' }).title).toBe('Jersey fabric');
    });

    // The image URL is taken from an untrusted page, so anything that is not
    // plain http(s) is dropped rather than ending up in an <img src>.
    it.each([
      ['a script URL', 'javascript:alert(1)'],
      ['an inline image', 'data:image/png;base64,iVBORw0KGgo='],
      ['a broken URL', 'https://'],
    ])('drops %s', (_case, imageUrl) => {
      expect(createLink({ imageUrl }).imageUrl).toBeNull();
    });
  });

  it('cleans up the organizing fields', () => {
    const link = createLink({
      category: '  Fabrics  ',
      tags: ['  jersey  ', '', '   ', 'jersey', 'blue'],
      note: '  Two metres  ',
    });

    expect(link.category).toBe('Fabrics');
    expect(link.tags).toEqual(['jersey', 'blue']);
    expect(link.note).toBe('Two metres');
  });

  it('treats a category of only whitespace as none', () => {
    expect(createLink({ category: '   ' }).category).toBeNull();
  });

  it('trims a custom status', () => {
    expect(createLink({ status: { kind: 'custom', label: '  Bought  ' } }).status).toEqual({
      kind: 'custom',
      label: 'Bought',
    });
  });

  // An unlabelled status would show up as an empty chip and split the status
  // filter into a nameless group.
  it('falls back to the default status when a custom label is blank', () => {
    expect(createLink({ status: { kind: 'custom', label: '   ' } }).status).toEqual(DEFAULT_STATUS);
  });
});

describe('applyEdits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('changes only the fields that were passed', () => {
    const link = createLink({ title: 'Jersey fabric', category: 'Fabrics', note: 'Two metres' });

    const edited = applyEdits(link, { note: 'Three metres' });

    expect(edited.note).toBe('Three metres');
    expect(edited.title).toBe('Jersey fabric');
    expect(edited.category).toBe('Fabrics');
  });

  it('leaves identity and origin alone', () => {
    const link = createLink();

    const edited = applyEdits(link, { title: 'Something else' });

    expect(edited.id).toBe(link.id);
    expect(edited.url).toBe(link.url);
    expect(edited.domain).toBe(link.domain);
    expect(edited.createdAt).toBe(link.createdAt);
  });

  it('records when the link was last changed', () => {
    vi.setSystemTime(new Date('2026-08-17T10:00:00.000Z'));
    const link = createLink();

    vi.setSystemTime(new Date('2026-08-18T09:30:00.000Z'));
    const edited = applyEdits(link, { note: 'Later thought' });

    expect(edited.updatedAt).toBe('2026-08-18T09:30:00.000Z');
  });

  it('does not mutate the link it was given', () => {
    const link = createLink({ note: 'Two metres' });

    applyEdits(link, { note: 'Three metres' });

    expect(link.note).toBe('Two metres');
  });

  it('applies the same cleanup as saving does', () => {
    const link = createLink();

    const edited = applyEdits(link, {
      title: '   ',
      tags: ['  jersey  ', 'jersey', ''],
      category: '  ',
      imageUrl: 'javascript:alert(1)',
      status: { kind: 'custom', label: '  Bought  ' },
    });

    expect(edited.title).toBe('shop.example');
    expect(edited.tags).toEqual(['jersey']);
    expect(edited.category).toBeNull();
    expect(edited.imageUrl).toBeNull();
    expect(edited.status).toEqual({ kind: 'custom', label: 'Bought' });
  });

  it('can clear the image and the category again', () => {
    const link = createLink({
      category: 'Fabrics',
      imageUrl: 'https://shop.example/preview.jpg',
    });

    const edited = applyEdits(link, { category: null, imageUrl: null });

    expect(edited.category).toBeNull();
    expect(edited.imageUrl).toBeNull();
  });
});
