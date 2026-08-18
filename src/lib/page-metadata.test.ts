// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { extractPageMetadata } from './page-metadata';

/** Builds the page the extraction is run against. */
function givenPage(head: string, title = ''): void {
  document.head.innerHTML = head;
  document.title = title;
}

beforeEach(() => {
  givenPage('');
});

describe('the title', () => {
  // What the site itself wants shown when shared is usually cleaner than the
  // <title>, which tends to carry the shop name and a slogan.
  it('prefers what the page publishes for sharing', () => {
    givenPage('<meta property="og:title" content="Jersey fabric, blue">', 'Jersey — MegaShop');

    expect(extractPageMetadata().title).toBe('Jersey fabric, blue');
  });

  it('falls back to the document title', () => {
    givenPage('', 'Jersey — MegaShop');

    expect(extractPageMetadata().title).toBe('Jersey — MegaShop');
  });

  it.each([
    ['an empty tag', '<meta property="og:title" content="">'],
    ['a tag of only whitespace', '<meta property="og:title" content="   ">'],
  ])('ignores %s', (_case, head) => {
    givenPage(head, 'Jersey — MegaShop');

    expect(extractPageMetadata().title).toBe('Jersey — MegaShop');
  });

  it('trims what it found', () => {
    givenPage('<meta property="og:title" content="  Jersey fabric  ">');

    expect(extractPageMetadata().title).toBe('Jersey fabric');
  });

  // Saving must work even here; the caller fills the gap.
  it('reports an empty title when the page has none', () => {
    expect(extractPageMetadata().title).toBe('');
  });
});

describe('the preview image', () => {
  it('takes the Open Graph image', () => {
    givenPage('<meta property="og:image" content="https://shop.example/preview.jpg">');

    expect(extractPageMetadata().imageUrl).toBe('https://shop.example/preview.jpg');
  });

  it('falls back to the Twitter card image', () => {
    givenPage('<meta name="twitter:image" content="https://shop.example/card.jpg">');

    expect(extractPageMetadata().imageUrl).toBe('https://shop.example/card.jpg');
  });

  it('prefers Open Graph over the Twitter card', () => {
    givenPage(
      '<meta property="og:image" content="https://shop.example/preview.jpg">' +
        '<meta name="twitter:image" content="https://shop.example/card.jpg">',
    );

    expect(extractPageMetadata().imageUrl).toBe('https://shop.example/preview.jpg');
  });

  // Relative URLs are common in meta tags and useless once stored elsewhere.
  it('resolves a relative URL against the page', () => {
    givenPage('<meta property="og:image" content="/img/preview.jpg">');

    expect(extractPageMetadata().imageUrl).toBe('http://localhost:3000/img/preview.jpg');
  });

  it('reports no image when the page offers none', () => {
    expect(extractPageMetadata().imageUrl).toBeNull();
  });

  it('reports no image for a value that is no URL at all', () => {
    givenPage('<meta property="og:image" content="   ">');

    expect(extractPageMetadata().imageUrl).toBeNull();
  });

  // Deciding what may be rendered is the caller's job (src/lib/saved-link),
  // which is what a test there covers. Extraction stays purely descriptive.
  it('passes a dangerous URL on rather than deciding about it', () => {
    givenPage('<meta property="og:image" content="javascript:alert(1)">');

    expect(extractPageMetadata().imageUrl).toBe('javascript:alert(1)');
  });
});

// The function is serialized and rebuilt inside the visited page, so anything
// it reaches for outside its own body would be undefined over there.
it('is self-contained enough to be injected', () => {
  const source = extractPageMetadata.toString();

  expect(source).not.toMatch(/\bimport\b|\brequire\(/);
});
