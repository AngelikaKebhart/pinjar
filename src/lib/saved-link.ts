import { extractDomain, isSafeImageUrl } from './url';

/**
 * The data model of a saved link (see docs/concept.md §4).
 *
 * These are pure, storage-agnostic helpers: they build and edit link objects
 * but never read or write anything. Persistence lives in `./storage`.
 */

export interface SavedLink {
  id: string;
  url: string;
  /** Hostname of `url`, kept alongside it so the badge does not re-parse. */
  domain: string;
  title: string;
  imageUrl: string | null;
  category: string | null;
  tags: string[];
  /**
   * The user's own wording, never translated, or `null` for a link they have
   * not filed under one. Optional exactly like the category: how far along
   * something is only means anything once the user has said so, and a status
   * the extension invents would be on every link and tell nobody anything.
   */
  status: string | null;
  note: string;
  /** ISO 8601, formatted for display through `Intl` in the active language. */
  createdAt: string;
  updatedAt: string;
}

/** What a caller supplies when saving a page; the rest is derived. */
export interface SavedLinkDraft {
  url: string;
  /** Page title as extracted; may be empty when extraction failed. */
  title?: string;
  /** `og:image` as extracted; anything but `http(s)` is dropped. */
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[];
  status?: string | null;
  note?: string;
}

/** The fields the user may change afterwards — URL and domain stay fixed. */
export type SavedLinkEdits = Partial<
  Pick<SavedLink, 'title' | 'imageUrl' | 'category' | 'tags' | 'status' | 'note'>
>;

/**
 * Builds a link from what was captured on the page.
 *
 * Returns `null` — a regular return value, because the caller is expected to
 * tell the user — when the URL has no domain to file the link under:
 * browser-internal pages (`chrome://`, `about:`) and anything but `http(s)`.
 *
 * Everything else degrades instead of failing: a missing title falls back to
 * the domain, an unusable image URL becomes `null` (docs/concept.md §7.1).
 */
export function createSavedLink(draft: SavedLinkDraft): SavedLink | null {
  const domain = extractDomain(draft.url);
  if (domain === null) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    url: draft.url,
    domain,
    title: normalizeTitle(draft.title, domain),
    imageUrl: normalizeImageUrl(draft.imageUrl),
    category: normalizeOptionalName(draft.category),
    tags: normalizeTags(draft.tags),
    status: normalizeOptionalName(draft.status),
    note: draft.note?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Returns a copy of `link` with the given fields replaced and `updatedAt`
 * bumped. Fields left out of `edits` keep their previous value.
 */
export function applyEdits(link: SavedLink, edits: SavedLinkEdits): SavedLink {
  return {
    ...link,
    title: 'title' in edits ? normalizeTitle(edits.title, link.domain) : link.title,
    imageUrl: 'imageUrl' in edits ? normalizeImageUrl(edits.imageUrl) : link.imageUrl,
    category: 'category' in edits ? normalizeOptionalName(edits.category) : link.category,
    tags: 'tags' in edits ? normalizeTags(edits.tags) : link.tags,
    status: 'status' in edits ? normalizeOptionalName(edits.status) : link.status,
    note: 'note' in edits ? (edits.note?.trim() ?? '') : link.note,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * A link with no title would render as an empty row and, worse, as an empty alt
 * text on its preview image. The domain is always available and still says
 * something about where the link leads.
 */
function normalizeTitle(title: string | undefined, domain: string): string {
  return title?.trim() || domain;
}

/** Image URLs come from untrusted pages; only `http(s)` may ever be rendered. */
function normalizeImageUrl(imageUrl: string | null | undefined): string | null {
  return isSafeImageUrl(imageUrl) ? imageUrl : null;
}

/**
 * The category and the status are both a single name the user may leave unset,
 * and both are blank-or-absent in the same way: a field left empty, a whitespace
 * entry, or nothing supplied at all. One `null` for all of them, so "no
 * category" is one value to test for rather than three.
 */
function normalizeOptionalName(name: string | null | undefined): string | null {
  return name?.trim() || null;
}

/** Drops blank tags and repetitions so the tag filter cannot list a tag twice. */
function normalizeTags(tags: string[] | undefined): string[] {
  const trimmed = (tags ?? []).map((tag) => tag.trim()).filter((tag) => tag !== '');
  return [...new Set(trimmed)];
}
