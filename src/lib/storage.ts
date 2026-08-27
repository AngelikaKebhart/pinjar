import { storage } from 'wxt/utils/storage';
import {
  countUsage,
  countUsageOf,
  removeValueFromLinks,
  renameValueInLinks,
  type OrganizationKind,
} from './organization';
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
 * Values the user has used before, kept so the dashboard can offer them, stored
 * separately from the links (docs/concept.md §4).
 *
 * Categories and status labels are deliberately never pruned: a category the
 * user created stays offered instead of quietly disappearing with the last link
 * that used it, and a status nothing is in right now is a stage of the user's
 * workflow rather than a leftover. Both are cleared by hand, from the dialog
 * that lists them.
 */
export const categories = defineList<string>('local:categories');
/**
 * Tags are the exception, and `forgetUnusedTags` keeps them so: every
 * remembered tag is on at least one saved link. They are invented by the dozen
 * and cost nothing to type again, so the list of every one ever used would be
 * the longest of the three and the least worth reading.
 */
export const tags = defineList<string>('local:tags');
/** Every status label the user has written — there is no other kind. */
export const statuses = defineList<string>('local:statuses');

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
  const remaining = links.map((link) => (link.id === id ? updated : link));

  await savedLinks.setValue(remaining);
  await rememberOrganizationValues(updated);
  await forgetUnusedTags(remaining);

  return updated;
}

export async function removeSavedLink(id: string): Promise<void> {
  const links = await getSavedLinks();
  const remaining = links.filter((link) => link.id !== id);

  await savedLinks.setValue(remaining);
  await forgetUnusedTags(remaining);
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
  statuses: string[];
}): Promise<void> {
  const existing = await getSavedLinks();
  const merged = [...existing, ...data.links].sort(
    (one, other) => Date.parse(other.createdAt) - Date.parse(one.createdAt),
  );

  await savedLinks.setValue(merged);

  await Promise.all([
    addUnknownValues(categories, data.categories),
    addUnknownValues(tags, data.tags),
    addUnknownValues(statuses, data.statuses),
  ]);

  // The file's tag list may name tags none of its links carries. They are added
  // above and dropped here rather than filtered beforehand, so that the rule
  // stays in one place: a remembered tag is a tag some link has.
  await forgetUnusedTags(merged);
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
    statuses.removeValue(),
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
    getStatuses(),
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
    statuses.watch(onChange),
  ];

  return () => unwatchers.forEach((unwatch) => unwatch());
}

export function getCategories(): Promise<string[]> {
  return categories.getValue();
}

export function getTags(): Promise<string[]> {
  return tags.getValue();
}

export function getStatuses(): Promise<string[]> {
  return statuses.getValue();
}

/**
 * The remembered lists by kind: what `OrganizationKind` names on the link side
 * is one of these on the stored side.
 */
const ORGANIZATION_LISTS: Record<OrganizationKind, StoredList<string>> = {
  category: categories,
  tag: tags,
  status: statuses,
};

/** One remembered value, with what still hangs on it. */
export interface OrganizationValue {
  value: string;
  /** How many saved links carry it; zero for one nothing uses any more. */
  usage: number;
}

/**
 * Every remembered value of one kind, in the order they were first used, each
 * with the number of links carrying it.
 *
 * A value some link carries but the list has lost is listed too, rather than
 * hidden: what cannot be seen cannot be renamed or deleted either, and a value
 * out of reach of the one screen for reaching it would be stuck for good.
 */
export async function getOrganizationValues(kind: OrganizationKind): Promise<OrganizationValue[]> {
  const [known, links] = await Promise.all([ORGANIZATION_LISTS[kind].getValue(), getSavedLinks()]);
  const usage = countUsage(links, kind);
  const forgotten = [...usage.keys()].filter((value) => !known.includes(value));

  return [...known, ...forgotten].map((value) => ({ value, usage: usage.get(value) ?? 0 }));
}

/** What a rename did, so the interface can say it in words. */
export interface RenameOutcome {
  /** How many links were rewritten. */
  affected: number;
  /** Whether the new name was already in use, so that two became one. */
  merged: boolean;
}

/**
 * Renames one value everywhere: in the remembered list, and on every link
 * carrying it. Returns `null` — a regular return value, because the caller is
 * expected to tell the user — when the new name is blank, unchanged, or the
 * old one is not known here.
 *
 * A name that already exists merges the two rather than being refused. That is
 * what a rename means when it collides: the same thing was typed twice, once
 * with a slip, and refusing would leave the user to delete one by hand.
 */
export async function renameOrganizationValue(
  kind: OrganizationKind,
  from: string,
  to: string,
): Promise<RenameOutcome | null> {
  const name = to.trim();
  const list = ORGANIZATION_LISTS[kind];
  const [known, links] = await Promise.all([list.getValue(), getSavedLinks()]);
  const usage = countUsage(links, kind);

  if (name === '' || name === from || !(known.includes(from) || usage.has(from))) {
    return null;
  }

  const renamed = known.includes(from)
    ? known.map((value) => (value === from ? name : value))
    : [...known, name];

  await list.setValue([...new Set(renamed)]);

  // Left alone when nothing carries the value: writing every link back
  // unchanged would wake every watcher for a list that has not moved.
  const affected = usage.get(from) ?? 0;
  if (affected > 0) {
    await savedLinks.setValue(renameValueInLinks(links, kind, from, name));
  }

  return { affected, merged: known.includes(name) || usage.has(name) };
}

/**
 * Forgets one value and takes it off every link that carried it, and says how
 * many those were. The links themselves stay: deleting a category is not a way
 * to delete what was filed under it.
 */
export async function deleteOrganizationValue(
  kind: OrganizationKind,
  value: string,
): Promise<number> {
  const list = ORGANIZATION_LISTS[kind];
  const [known, links] = await Promise.all([list.getValue(), getSavedLinks()]);

  await list.setValue(known.filter((each) => each !== value));

  const affected = countUsageOf(links, kind, value);
  if (affected > 0) {
    await savedLinks.setValue(removeValueFromLinks(links, kind, value));
  }

  return affected;
}

/**
 * Drops every tag no saved link carries any more — see `tags` above for why
 * only tags. Called after each write that can take a tag's last use away, which
 * is an edit, a deletion, and the import that brings a list of its own.
 */
async function forgetUnusedTags(links: SavedLink[]): Promise<void> {
  const known = await tags.getValue();
  const inUse = countUsage(links, 'tag');
  const remaining = known.filter((tag) => inUse.has(tag));

  if (remaining.length !== known.length) {
    await tags.setValue(remaining);
  }
}

/**
 * Forgets every remembered value of one kind that no link carries, and says how
 * many those were — the "remove unused" the dialog offers for the two kinds
 * that accumulate them.
 *
 * Takes any kind rather than only those two: `forgetUnusedTags` leaves tags
 * with nothing to find, and a function that answers zero is easier to live with
 * than a parameter type that has to explain which kinds are allowed.
 */
export async function deleteUnusedOrganizationValues(kind: OrganizationKind): Promise<number> {
  const list = ORGANIZATION_LISTS[kind];
  const [known, links] = await Promise.all([list.getValue(), getSavedLinks()]);
  const usage = countUsage(links, kind);
  const used = known.filter((value) => usage.has(value));

  if (used.length === known.length) {
    return 0;
  }

  await list.setValue(used);

  return known.length - used.length;
}

/** Keeps the suggestion lists up to date with what a link actually uses. */
async function rememberOrganizationValues(link: SavedLink): Promise<void> {
  await Promise.all([
    addUnknownValues(categories, link.category === null ? [] : [link.category]),
    addUnknownValues(tags, link.tags),
    addUnknownValues(statuses, link.status === null ? [] : [link.status]),
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
