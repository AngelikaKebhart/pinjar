import { storage } from 'wxt/utils/storage';
import {
  applyEdits,
  createSavedLink,
  type SavedLink,
  type SavedLinkDraft,
  type SavedLinkEdits,
} from './saved-link';

/**
 * The single place that reads and writes saved links.
 *
 * Popup, dashboard and background worker all go through these functions — no
 * component touches `storage.local` itself. Everything stays in the browser;
 * nothing here ever leaves the device (see docs/concept.md §7.3).
 *
 * Writes read the whole list, change it and write it back. Two writes started
 * in the very same moment from two open views could therefore lose one of the
 * changes. Every write here is a deliberate user action on a list of at most a
 * few thousand entries, so that window is not worth a locking scheme.
 */

/**
 * All saved links, newest first.
 *
 * Exported so the background worker and the UI can `watch()` for changes; for
 * reading and writing use the functions below, which keep the suggestion lists
 * in sync.
 */
export const savedLinks = defineList<SavedLink>('local:savedLinks');

/**
 * Values the user has used before, kept so the dashboard can offer them.
 *
 * They are stored separately from the links (docs/concept.md §4) and are
 * deliberately not pruned when the last link using them is deleted: a category
 * the user once created stays offered instead of quietly disappearing.
 */
export const categories = defineList<string>('local:categories');
export const tags = defineList<string>('local:tags');
/** Custom status labels only — the built-in default is always available. */
export const customStatuses = defineList<string>('local:customStatuses');

/** A stored list, exported so callers can `watch()` one without naming its type. */
export type StoredList<T> = ReturnType<typeof defineList<T>>;

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
 * Wipes every saved link and every remembered suggestion — the "delete all my
 * data" the user is entitled to (docs/concept.md §7.3).
 *
 * The interface language is a setting, not user data, and stays untouched:
 * having the dashboard flip to another language would be a confusing way to
 * confirm a deletion.
 */
export async function deleteAllSavedData(): Promise<void> {
  await Promise.all([
    savedLinks.removeValue(),
    categories.removeValue(),
    tags.removeValue(),
    customStatuses.removeValue(),
  ]);
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
