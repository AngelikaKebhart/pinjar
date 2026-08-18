export interface PageMetadata {
  /** Empty when the page offers nothing usable; the caller then falls back. */
  title: string;
  imageUrl: string | null;
}

/**
 * Reads title and preview image from a visited page.
 *
 * **This function runs inside the visited page**, injected on demand with
 * `scripting.executeScript` when the user saves (see docs/concept.md §6.4).
 * It is serialized and re-created over there, which means it cannot reference
 * anything outside its own body — no imports, no module-level constants, no
 * helpers from this file. Everything it needs is declared inside it.
 *
 * It only ever reads: it looks at meta tags and the document title and never
 * calls anything the page defines, so a hostile page has nothing to hook into.
 * Whatever it returns is still untrusted input and is validated by the caller.
 */
export function extractPageMetadata(): PageMetadata {
  const readMeta = (selector: string): string | null => {
    const element = document.querySelector(selector);
    const content = element instanceof HTMLMetaElement ? element.content.trim() : '';
    return content === '' ? null : content;
  };

  // Open Graph first: it is what the site itself wants shown when shared, and
  // is usually cleaner than a <title> carrying the shop name and a slogan.
  const title = readMeta('meta[property="og:title"]') ?? document.title.trim();

  const image = readMeta('meta[property="og:image"]') ?? readMeta('meta[name="twitter:image"]');

  return { title, imageUrl: image === null ? null : toAbsoluteUrl(image) };

  /**
   * Image URLs in meta tags are regularly relative ("/img/preview.jpg"), which
   * is useless once stored and rendered outside the page.
   */
  function toAbsoluteUrl(url: string): string | null {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return null;
    }
  }
}
