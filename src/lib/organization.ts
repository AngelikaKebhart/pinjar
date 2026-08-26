import { DEFAULT_STATUS, type SavedLink } from './saved-link';

/**
 * Renaming and deleting the values links are organized by (docs/concept.md
 * §3.3): categories, tags and the user's own status labels.
 *
 * Pure functions over an array of links — no storage, no React. Persistence
 * lives in `./storage`, which is also where the remembered lists of values are.
 *
 * The three facets are one module rather than three, because they differ only
 * in how a link carries the value: one field, an array, or a label inside a
 * tagged union. Everything above that — counting what a value is used by,
 * rewriting it everywhere, taking it off every link — is the same work three
 * times over, and three copies of it would drift.
 *
 * A link is stored as a plain string, not by reference, so both operations are
 * a rewrite of every link that carries the value. `updatedAt` deliberately
 * stays as it was: it says when the user last changed *this link*, and renaming
 * a category the user never opened it to touch is not that.
 */

/** Which of the three a call is about. */
export type OrganizationKind = 'category' | 'tag' | 'status';

interface OrganizationFacet {
  /** What this link carries for the facet — none, one, or several. */
  valuesOf: (link: SavedLink) => string[];
  /** The link with `from` replaced by `to`, or the link itself if it has none. */
  withValueRenamed: (link: SavedLink, from: string, to: string) => SavedLink;
  /**
   * The link without the value. Nothing is deleted along with it: a link
   * without a category is a link "without a category", and one whose custom
   * status goes falls back to the built-in one.
   */
  withValueRemoved: (link: SavedLink, value: string) => SavedLink;
}

const FACETS: Record<OrganizationKind, OrganizationFacet> = {
  category: {
    valuesOf: (link) => (link.category === null ? [] : [link.category]),
    withValueRenamed: (link, from, to) =>
      link.category === from ? { ...link, category: to } : link,
    withValueRemoved: (link, value) =>
      link.category === value ? { ...link, category: null } : link,
  },

  tag: {
    valuesOf: (link) => link.tags,
    // Deduplicated, because renaming a tag onto one the link already carries
    // merges the two — and a link listing the same tag twice would show it
    // twice in the form and be untickable.
    withValueRenamed: (link, from, to) =>
      link.tags.includes(from)
        ? { ...link, tags: [...new Set(link.tags.map((tag) => (tag === from ? to : tag)))] }
        : link,
    withValueRemoved: (link, value) =>
      link.tags.includes(value)
        ? { ...link, tags: link.tags.filter((tag) => tag !== value) }
        : link,
  },

  status: {
    valuesOf: (link) => (link.status.kind === 'custom' ? [link.status.label] : []),
    withValueRenamed: (link, from, to) =>
      carriesCustomStatus(link, from) ? { ...link, status: { kind: 'custom', label: to } } : link,
    withValueRemoved: (link, value) =>
      carriesCustomStatus(link, value) ? { ...link, status: DEFAULT_STATUS } : link,
  },
};

function carriesCustomStatus(link: SavedLink, label: string): boolean {
  return link.status.kind === 'custom' && link.status.label === label;
}

/**
 * How many links carry each value of one kind. Values no link uses are absent
 * rather than zero — what is remembered but unused is the stored list's
 * business, not this one's.
 */
export function countUsage(links: SavedLink[], kind: OrganizationKind): Map<string, number> {
  const counts = new Map<string, number>();

  for (const link of links) {
    for (const value of FACETS[kind].valuesOf(link)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return counts;
}

export function countUsageOf(links: SavedLink[], kind: OrganizationKind, value: string): number {
  return links.filter((link) => FACETS[kind].valuesOf(link).includes(value)).length;
}

/**
 * Every link, with `from` rewritten to `to` wherever it appears. Links that
 * never carried it come back untouched — the same object, so a re-render can
 * still tell what actually changed.
 */
export function renameValueInLinks(
  links: SavedLink[],
  kind: OrganizationKind,
  from: string,
  to: string,
): SavedLink[] {
  return links.map((link) => FACETS[kind].withValueRenamed(link, from, to));
}

/** Every link, with the value taken off the ones that carried it. */
export function removeValueFromLinks(
  links: SavedLink[],
  kind: OrganizationKind,
  value: string,
): SavedLink[] {
  return links.map((link) => FACETS[kind].withValueRemoved(link, value));
}
