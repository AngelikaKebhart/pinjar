/**
 * URL helpers built on the native `URL` API.
 *
 * Domain handling must never be done with hand-rolled regular expressions:
 * those are easy to fool with crafted URLs and would cause the badge indicator
 * to attribute saved links to the wrong site.
 */

/** Schemes we are willing to store, open, or load images from. */
const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Returns the hostname of a URL, or `null` if the URL cannot be parsed or does
 * not use an allowed scheme (e.g. `javascript:`, `data:`, `file:`).
 */
export function extractDomain(url: string): string | null {
  const parsed = parseAllowedUrl(url);
  return parsed ? parsed.hostname : null;
}

/**
 * Checks whether a URL may be used as the `src` of a preview image.
 *
 * Image URLs are extracted from untrusted pages, so anything that is not plain
 * `http(s)` is rejected — most importantly `javascript:` and `data:` URLs.
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  return url != null && parseAllowedUrl(url) !== null;
}

function parseAllowedUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}
