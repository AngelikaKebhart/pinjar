import { storage } from 'wxt/utils/storage';
import {
  applyEdits,
  createSavedLink,
  type SavedLink,
  type SavedLinkDraft,
  type SavedLinkEdits,
} from './saved-link';

/**
 * The single place that reads and writes saved links — no component touches
 * `storage.local` itself. Everything stays on the device (docs/concept.md §7.3).
 *
 * Writes are read-modify-write, so two started in the very same moment from two
 * open views could lose one of the changes. Every write is a deliberate user
 * action on at most a few thousand entries, so that window is not worth a
 * locking scheme.
 */

/**
 * All saved links, newest first. Exported so the background worker and the UI
 * can `watch()` it; read and write through the functions below, which keep the
 * suggestion lists in sync.
 */
export const savedLinks = defineList<SavedLink>('local:savedLinks');

/**
 * Values the user has used before, kept so the dashboard can offer them. Stored
 * separately from the links (docs/concept.md §4) and deliberately never pruned:
 * a category the user created stays offered instead of quietly disappearing
 * with the last link that used it.
 */
export const categories = defineList<string>('local:categories');
export const tags = defineList<string>('local:tags');
/** Custom status labels only — the built-in default is always available. */
export const customStatuses = defineList<string>('local:customStatuses');

type StoredList<T> = ReturnType<typeof defineList<T>>;

function defineList<T>(key: `local:${string}`) {
  return storage.defineItem<T[]>(key, { fallback: [] });
}

export function getSavedLinks(): Promise<SavedLink[]> {
  return savedLinks.getValue();
}

/** The links shown in the popup: everything saved for the visited site. */
export async function getSavedLinksForDomain(domain: string): Promise<SavedLink[]> {
  const links = await getSavedLinks();
  return links.filter((link) => link.domain === domain);
}

/** What the badge shows (docs/concept.md §3.2). */
export async function countSavedLinksForDomain(domain: string): Promise<number> {
  const links = await getSavedLinksForDomain(domain);
  return links.length;
}

/** Lets the popup tell whether the page the user is on is already saved. */
export async function findSavedLinkByUrl(url: string): Promise<SavedLink | null> {
  const links = await getSavedLinks();
  return links.find((link) => link.url === url) ?? null;
}

/**
 * Saves a page and returns the stored link, or `null` when the URL cannot be
 * saved (see `createSavedLink`).
 */
export async function addSavedLink(draft: SavedLinkDraft): Promise<SavedLink | null> {
  const link = createSavedLink(draft);
  if (link === null) {
    return null;
  }

  const links = await getSavedLinks();
  await savedLinks.setValue([link, ...links]);
  await rememberOrganizationValues(link);

  return link;
}

/**
 * Applies the user's edits to one link and returns it, or `null` if no link
 * with that id exists — which happens when it was deleted in another tab while
 * the edit form was open.
 */
export async function updateSavedLink(
  id: string,
  edits: SavedLinkEdits,
): Promise<SavedLink | null> {
  const links = await getSavedLinks();
  const existing = links.find((link) => link.id === id);
  if (existing === undefined) {
    return null;
  }

  const updated = applyEdits(existing, edits);
  await savedLinks.setValue(links.map((link) => (link.id === id ? updated : link)));
  await rememberOrganizationValues(updated);

  return updated;
}

export async function removeSavedLink(id: string): Promise<void> {
  const links = await getSavedLinks();
  await savedLinks.setValue(links.filter((link) => link.id !== id));
}

/**
 * Adds what an imported file holds to what is already here (§3.6).
 *
 * Adding, never replacing: the file is a copy from another browser, not the
 * truth about this one. Which of its links are new has been decided before they
 * get here — this function stores what it is handed.
 *
 * Sorted rather than appended, because the file's links interleave with the
 * local ones by age and the dashboard shows the newest first.
 */
export async function mergeImportedData(data: {
  links: SavedLink[];
  categories: string[];
  tags: string[];
  customStatuses: string[];
}): Promise<void> {
  const existing = await getSavedLinks();
  const merged = [...existing, ...data.links].sort(
    (one, other) => Date.parse(other.createdAt) - Date.parse(one.createdAt),
  );

  await savedLinks.setValue(merged);

  await Promise.all([
    addUnknownValues(categories, data.categories),
    addUnknownValues(tags, data.tags),
    addUnknownValues(customStatuses, data.customStatuses),
  ]);
}

/**
 * Wipes every saved link and every remembered suggestion — the "delete all my
 * data" the user is entitled to (docs/concept.md §7.3).
 *
 * The interface language is a setting, not user data, and stays untouched:
 * flipping the dashboard to another language is no way to confirm a deletion.
 */
export async function deleteAllSavedData(): Promise<void> {
  await Promise.all([
    savedLinks.removeValue(),
    categories.removeValue(),
    tags.removeValue(),
    customStatuses.removeValue(),
  ]);
}

/** What the dashboard needs in order to disable actions that would do nothing. */
export interface StoredDataPresence {
  /** At least one saved link. An export with no links would be an empty file. */
  hasLinks: boolean;
  /**
   * Anything at all. Categories, tags and status labels outlive the links that
   * used them, so "no links" does not mean "nothing left to delete" — and the
   * right to delete everything must not depend on an empty-looking list (§7.3).
   */
  hasAnything: boolean;
}

export async function getStoredDataPresence(): Promise<StoredDataPresence> {
  const [links, storedCategories, storedTags, storedStatuses] = await Promise.all([
    getSavedLinks(),
    getCategories(),
    getTags(),
    getCustomStatuses(),
  ]);

  const hasLinks = links.length > 0;
  const remembered = [storedCategories, storedTags, storedStatuses];

  return {
    hasLinks,
    hasAnything: hasLinks || remembered.some((list) => list.length > 0),
  };
}

/**
 * Calls back whenever any of that changes, and returns the way to stop. All
 * four lists, not just the links: an import can bring categories with it, and
 * deleting everything clears all of them at once.
 */
export function watchStoredData(onChange: () => void): () => void {
  const unwatchers = [
    savedLinks.watch(onChange),
    categories.watch(onChange),
    tags.watch(onChange),
    customStatuses.watch(onChange),
  ];

  return () => unwatchers.forEach((unwatch) => unwatch());
}

export function getCategories(): Promise<string[]> {
  return categories.getValue();
}

export function getTags(): Promise<string[]> {
  return tags.getValue();
}

export function getCustomStatuses(): Promise<string[]> {
  return customStatuses.getValue();
}

/** Keeps the suggestion lists up to date with what a link actually uses. */
async function rememberOrganizationValues(link: SavedLink): Promise<void> {
  await Promise.all([
    addUnknownValues(categories, link.category === null ? [] : [link.category]),
    addUnknownValues(tags, link.tags),
    addUnknownValues(customStatuses, link.status.kind === 'custom' ? [link.status.label] : []),
  ]);
}

async function addUnknownValues(list: StoredList<string>, values: string[]): Promise<void> {
  if (values.length === 0) {
    return;
  }

  const known = await list.getValue();
  const unknown = values.filter((value) => !known.includes(value));
  if (unknown.length === 0) {
    return;
  }

  await list.setValue([...known, ...unknown]);
}
