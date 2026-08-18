import { extractDomain, isSafeImageUrl } from './url';

/**
 * The data model of a saved link (see docs/concept.md §4).
 *
 * These are pure, storage-agnostic helpers: they build and edit link objects
 * but never read or write anything. Persistence lives in `./storage`.
 */

/**
 * Keys of statuses the extension ships itself. They are stored as keys, never
 * as translated text, so a language switch cannot orphan existing entries.
 */
export type BuiltinStatusKey = 'default';

/**
 * A status is either one of ours (translatable) or the user's own wording
 * (never translated). Telling the two apart by a `kind` field — rather than by
 * inspecting a plain string — also means a user-created status literally named
 * "default" cannot collide with the built-in one.
 */
export type LinkStatus =
  { kind: 'builtin'; key: BuiltinStatusKey } | { kind: 'custom'; label: string };

/** The status every link starts with, shown as "Gemerkt" / "Saved". */
export const DEFAULT_STATUS: LinkStatus = { kind: 'builtin', key: 'default' };

/**
 * A stable string identity for a status.
 *
 * Two statuses are the same one exactly when their keys match, which is what
 * the status filter compares — comparing the objects would need the same
 * `kind` check spelled out at every call site, and comparing the displayed
 * text would make a user-created status named "Saved" indistinguishable from
 * the built-in one.
 *
 * The kind is part of the key, so the two can never collide. This is an
 * in-memory identity, not a stored value: nothing persists it, and it is free
 * to change.
 */
export function statusToKey(status: LinkStatus): string {
  return status.kind === 'builtin' ? `builtin:${status.key}` : `custom:${status.label}`;
}

export interface SavedLink {
  id: string;
  url: string;
  /** Hostname of `url`, kept alongside it so the badge does not re-parse. */
  domain: string;
  title: string;
  imageUrl: string | null;
  category: string | null;
  tags: string[];
  status: LinkStatus;
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
  status?: LinkStatus;
  note?: string;
}

/** The fields the user may change afterwards — URL and domain stay fixed. */
export type SavedLinkEdits = Partial<
  Pick<SavedLink, 'title' | 'imageUrl' | 'category' | 'tags' | 'status' | 'note'>
>;

/**
 * Builds a link from what was captured on the page.
 *
 * Returns `null` when the URL cannot be saved at all — browser-internal pages
 * (`chrome://`, `about:`) and anything that is not `http(s)` have no domain to
 * file the link under. Callers are expected to tell the user, which is why this
 * is a regular return value rather than a thrown error.
 *
 * Everything else degrades instead of failing: a missing title falls back to
 * the domain, an unusable image URL becomes `null` (see docs/concept.md §7.1).
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
    category: normalizeCategory(draft.category),
    tags: normalizeTags(draft.tags),
    status: normalizeStatus(draft.status),
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
    category: 'category' in edits ? normalizeCategory(edits.category) : link.category,
    tags: 'tags' in edits ? normalizeTags(edits.tags) : link.tags,
    status: 'status' in edits ? normalizeStatus(edits.status) : link.status,
    note: 'note' in edits ? (edits.note?.trim() ?? '') : link.note,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * A link with no title at all would render as an empty row and, worse, as an
 * empty alt text on its preview image. The domain is the one thing that is
 * always available and still says something about where the link leads.
 */
function normalizeTitle(title: string | undefined, domain: string): string {
  return title?.trim() || domain;
}

/** Image URLs come from untrusted pages; only `http(s)` may ever be rendered. */
function normalizeImageUrl(imageUrl: string | null | undefined): string | null {
  return isSafeImageUrl(imageUrl) ? imageUrl : null;
}

function normalizeCategory(category: string | null | undefined): string | null {
  return category?.trim() || null;
}

/** Drops blank tags and repetitions so the tag filter cannot list a tag twice. */
function normalizeTags(tags: string[] | undefined): string[] {
  const trimmed = (tags ?? []).map((tag) => tag.trim()).filter((tag) => tag !== '');
  return [...new Set(trimmed)];
}

/** A custom status without a label carries no meaning, so it falls back. */
function normalizeStatus(status: LinkStatus | undefined): LinkStatus {
  if (status === undefined) {
    return DEFAULT_STATUS;
  }
  if (status.kind === 'builtin') {
    return status;
  }

  const label = status.label.trim();
  return label === '' ? DEFAULT_STATUS : { kind: 'custom', label };
}
