import { keyToStatus, statusToKey, type LinkStatus, type SavedLink } from './saved-link';

/**
 * Narrowing the dashboard list down (see docs/concept.md §3.5).
 *
 * Pure functions over an array — no storage, no React. Combining four filters
 * correctly is the kind of logic that is easy to get subtly wrong and hard to
 * see wrong in a browser, which is exactly what unit tests are for.
 */

export interface LinkFilterCriteria {
  /** Matched against title and note, ignoring case. Empty matches everything. */
  search: string;
  /**
   * `null` matches every category. The empty string matches only links
   * without one — it can never collide with a real category, because the
   * model turns a blank category into `null` before storing it.
   */
  category: string | null;
  /** A link has to carry all of them. Empty matches everything. */
  tags: string[];
  /** A key from `statusToKey`. `null` matches every status. */
  status: string | null;
}

/** Everything unset: the whole list, in the order storage returns it. */
export const NO_FILTER: LinkFilterCriteria = {
  search: '',
  category: null,
  tags: [],
  status: null,
};

/**
 * Whether anything is actually narrowed down.
 *
 * The dashboard needs this to tell "nothing saved yet" apart from "nothing
 * matches" — two situations that need very different words.
 */
export function isFiltering(criteria: LinkFilterCriteria): boolean {
  return (
    criteria.search.trim() !== '' ||
    criteria.category !== null ||
    criteria.tags.length > 0 ||
    criteria.status !== null
  );
}

/**
 * The links matching every criterion at once.
 *
 * Filters combine by narrowing: each one can only ever remove links, never
 * bring any back. Several tags therefore mean "carries all of these", not
 * "carries any of them" — picking a second tag that widened the result again
 * would be a strange thing for a filter to do.
 */
export function filterSavedLinks(links: SavedLink[], criteria: LinkFilterCriteria): SavedLink[] {
  const search = criteria.search.trim().toLowerCase();

  return links.filter(
    (link) =>
      matchesText(link, search) &&
      matchesCategory(link, criteria.category) &&
      matchesTags(link, criteria.tags) &&
      matchesStatus(link, criteria.status),
  );
}

/**
 * Title and note only, as specified. The category, tags and status have their
 * own filters, and folding them into the text search would make it impossible
 * to search for a word without also hitting every link merely tagged with it.
 */
function matchesText(link: SavedLink, search: string): boolean {
  if (search === '') {
    return true;
  }

  return link.title.toLowerCase().includes(search) || link.note.toLowerCase().includes(search);
}

function matchesCategory(link: SavedLink, category: string | null): boolean {
  if (category === null) {
    return true;
  }

  return category === '' ? link.category === null : link.category === category;
}

function matchesTags(link: SavedLink, tags: string[]): boolean {
  return tags.every((tag) => link.tags.includes(tag));
}

function matchesStatus(link: SavedLink, status: string | null): boolean {
  return status === null || statusToKey(link.status) === status;
}

/**
 * What each filter is worth offering (see docs/concept.md §3.5).
 *
 * A filter offers the values that the *other* filters leave. Picking the
 * category "Fabrics" therefore narrows the tag list down to the tags actually
 * used in it, instead of listing tags that could only ever produce an empty
 * result.
 *
 * Each filter is left out of its own calculation. A single-choice filter would
 * otherwise collapse to the one value already picked, and the tag list would
 * lose every tag as soon as one was ticked.
 *
 * Whatever is currently picked stays offered even when nothing carries it any
 * more — a dropdown whose value is missing from its own options renders blank,
 * and a ticked box that disappeared could never be unticked.
 */

export interface AvailableCategories {
  names: string[];
  /** Whether offering "without a category" would find anything. */
  uncategorised: boolean;
}

export function availableCategories(
  links: SavedLink[],
  criteria: LinkFilterCriteria,
): AvailableCategories {
  const relevant = filterSavedLinks(links, { ...criteria, category: null });
  const names = relevant
    .map((link) => link.category)
    .filter((category): category is string => category !== null);

  return {
    names: [...new Set(criteria.category ? [...names, criteria.category] : names)],
    uncategorised: relevant.some((link) => link.category === null) || criteria.category === '',
  };
}

export function availableTags(links: SavedLink[], criteria: LinkFilterCriteria): string[] {
  const relevant = filterSavedLinks(links, { ...criteria, tags: [] });

  return [...new Set([...relevant.flatMap((link) => link.tags), ...criteria.tags])];
}

export function availableStatuses(links: SavedLink[], criteria: LinkFilterCriteria): LinkStatus[] {
  const relevant = filterSavedLinks(links, { ...criteria, status: null });
  const byKey = new Map<string, LinkStatus>();

  for (const link of relevant) {
    byKey.set(statusToKey(link.status), link.status);
  }

  if (criteria.status !== null && !byKey.has(criteria.status)) {
    byKey.set(criteria.status, keyToStatus(criteria.status));
  }

  return [...byKey.values()];
}
