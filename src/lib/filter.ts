import type { SavedLink } from './saved-link';

/**
 * Narrowing the dashboard list down (docs/concept.md §3.5).
 *
 * Pure functions over an array — no storage, no React.
 */

export interface LinkFilterCriteria {
  /** Matched against title and note, ignoring case. Empty matches everything. */
  search: string;
  /**
   * `null` matches every category; the empty string matches only links without
   * one. That cannot collide with a real category, because the model turns a
   * blank one into `null` before storing it.
   */
  category: string | null;
  /** A link has to carry all of them. Empty matches everything. */
  tags: string[];
  /** Read exactly like `category`: `null` matches all, `''` matches unset. */
  status: string | null;
  /**
   * A hostname as stored on the link. `null` matches every domain; there is no
   * "without a domain" case, since such a link cannot be saved at all.
   */
  domain: string | null;
}

/** Everything unset: the whole list, in the order storage returns it. */
export const NO_FILTER: LinkFilterCriteria = {
  search: '',
  category: null,
  tags: [],
  status: null,
  domain: null,
};

/**
 * Whether anything is actually narrowed down — what tells "nothing saved yet"
 * apart from "nothing matches", two situations needing very different words.
 */
export function isFiltering(criteria: LinkFilterCriteria): boolean {
  return (
    criteria.search.trim() !== '' ||
    criteria.category !== null ||
    criteria.tags.length > 0 ||
    criteria.status !== null ||
    criteria.domain !== null
  );
}

/**
 * The links matching every criterion at once. Filters combine by narrowing, so
 * several tags mean "carries all of these": picking a second tag that widened
 * the result again would be a strange thing for a filter to do.
 */
export function filterSavedLinks(links: SavedLink[], criteria: LinkFilterCriteria): SavedLink[] {
  const search = criteria.search.trim().toLowerCase();

  return links.filter(
    (link) =>
      matchesText(link, search) &&
      matchesCategory(link, criteria.category) &&
      matchesTags(link, criteria.tags) &&
      matchesStatus(link, criteria.status) &&
      matchesDomain(link, criteria.domain),
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
  return matchesOptionalName(link.category, category);
}

function matchesTags(link: SavedLink, tags: string[]): boolean {
  return tags.every((tag) => link.tags.includes(tag));
}

function matchesStatus(link: SavedLink, status: string | null): boolean {
  return matchesOptionalName(link.status, status);
}

/** `null` wanted means every link; the empty string means only unset ones. */
function matchesOptionalName(carried: string | null, wanted: string | null): boolean {
  if (wanted === null) {
    return true;
  }

  return wanted === '' ? carried === null : carried === wanted;
}

function matchesDomain(link: SavedLink, domain: string | null): boolean {
  return domain === null || link.domain === domain;
}

/**
 * What each filter is worth offering (docs/concept.md §3.5).
 *
 * A filter offers the values that the *other* filters leave: picking the
 * category "Fabrics" narrows the tag list to the tags actually used in it,
 * rather than listing tags that could only produce an empty result.
 *
 * Each filter is left out of its own calculation, or a single-choice filter
 * would collapse to the value already picked and the tag list would lose every
 * tag as soon as one was ticked.
 *
 * Whatever is picked stays offered even when nothing carries it any more — a
 * dropdown whose value is missing from its options renders blank, and a ticked
 * box that disappeared could never be unticked.
 */

/** What a filter over one optional name — the category, the status — can offer. */
export interface AvailableNames {
  names: string[];
  /** Whether offering "without one" would find anything. */
  unset: boolean;
}

export function availableCategories(
  links: SavedLink[],
  criteria: LinkFilterCriteria,
): AvailableNames {
  return availableNames(links, criteria, 'category');
}

export function availableStatuses(
  links: SavedLink[],
  criteria: LinkFilterCriteria,
): AvailableNames {
  return availableNames(links, criteria, 'status');
}

function availableNames(
  links: SavedLink[],
  criteria: LinkFilterCriteria,
  field: 'category' | 'status',
): AvailableNames {
  const picked = criteria[field];
  const relevant = filterSavedLinks(links, { ...criteria, [field]: null });
  const names = relevant.map((link) => link[field]).filter((name): name is string => name !== null);

  return {
    names: [...new Set(picked ? [...names, picked] : names)],
    unset: relevant.some((link) => link[field] === null) || picked === '',
  };
}

export function availableTags(links: SavedLink[], criteria: LinkFilterCriteria): string[] {
  const relevant = filterSavedLinks(links, { ...criteria, tags: [] });

  return [...new Set([...relevant.flatMap((link) => link.tags), ...criteria.tags])];
}

export function availableDomains(links: SavedLink[], criteria: LinkFilterCriteria): string[] {
  const relevant = filterSavedLinks(links, { ...criteria, domain: null });
  const domains = relevant.map((link) => link.domain);

  return [...new Set(criteria.domain ? [...domains, criteria.domain] : domains)];
}
