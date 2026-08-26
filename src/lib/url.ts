/**
 * URL helpers built on the native `URL` API — never on hand-rolled regular
 * expressions, which crafted URLs fool easily enough to make the badge
 * attribute saved links to the wrong site.
 */

/** Schemes we are willing to store, open, or load images from. */
const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Returns the hostname of a URL, or `null` if the URL cannot be parsed or does
 * not use an allowed scheme (e.g. `javascript:`, `data:`, `file:`).
 */
export function extractDomain(url: string): string | null {
  const parsed = parseAllowedUrl(url);
  return parsed ? normalizeHostname(parsed.hostname) : null;
}

/**
 * Strips the trailing dot of a fully qualified hostname. `example.com.` and
 * `example.com` are the same host, but the `URL` API keeps the dot; left in
 * place it would split one shop into two domains, and the popup would look
 * empty on a page whose links are filed under the other spelling.
 *
 * A hostname that is nothing but the root label is no host at all.
 */
function normalizeHostname(hostname: string): string | null {
  const withoutRootLabel = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  return withoutRootLabel === '' ? null : withoutRootLabel;
}

/**
 * Whether a URL may be used as the `src` of a preview image. These come from
 * untrusted pages, so anything but plain `http(s)` is rejected — most
 * importantly `javascript:` and `data:`.
 */
export function isSafeImageUrl(url: string | null | undefined): url is string {
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
