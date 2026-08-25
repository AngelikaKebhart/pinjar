import { createSavedLink, DEFAULT_STATUS, type LinkStatus, type SavedLink } from './saved-link';
import {
  getCategories,
  getCustomStatuses,
  getSavedLinks,
  getTags,
  mergeImportedData,
} from './storage';

/**
 * Carrying the wishlist out as a file, and reading one back in (§3.6).
 *
 * There is no account and no sync, so a file the user carries themselves is
 * the only way this data reaches another browser — and the only backup that
 * exists at all.
 */

/** Marks a file as ours, so any other JSON file can be told apart from it. */
export const EXPORT_FORMAT = 'pinjar';

/**
 * Raised only when a file stops being readable by older versions.
 *
 * Written from the very first file even though nothing reads it yet: the
 * reader arrives later, and by then these files are already out there. A
 * version that was never written cannot be added afterwards.
 */
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  /**
   * When the file was written. The whole point of it is being carried between
   * devices, where two copies are otherwise impossible to tell apart — a file
   * name does not survive being renamed or downloaded a second time.
   */
  exportedAt: string;
  links: SavedLink[];
  /**
   * The suggestion lists travel too, and separately from the links, exactly as
   * they are stored (docs/concept.md §4). A category the user created and has
   * not used yet would otherwise not survive the move.
   */
  categories: string[];
  tags: string[];
  customStatuses: string[];
}

/** Everything the user would lose by deleting, in one object. */
export async function buildExportFile(): Promise<ExportFile> {
  const [links, categories, tags, customStatuses] = await Promise.all([
    getSavedLinks(),
    getCategories(),
    getTags(),
    getCustomStatuses(),
  ]);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    links,
    categories,
    tags,
    customStatuses,
  };
}

/**
 * A name that says where the file came from and sorts by date.
 *
 * The date is the local one, not UTC: it names the day the user pressed the
 * button, which shortly after midnight is not the same day `toISOString()`
 * would report.
 */
export function exportFileName(now = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return `pinjar-${date}.json`;
}

/**
 * Why a file could not be read at all. Each one maps to its own message: a
 * wrong file is a normal mistake, and the user has to be told which mistake.
 */
export type ImportProblem = 'notReadable' | 'notOurFormat' | 'tooNew';

export type ImportOutcome =
  | {
      status: 'imported';
      /** Links that were new to this browser. */
      added: number;
      /** Links whose address was already saved here, left as they are. */
      duplicates: number;
      /** Entries too damaged to build a link from. */
      unusable: number;
    }
  | { status: 'failed'; problem: ImportProblem };

/**
 * Reads a file and adds what it holds to what is already here.
 *
 * Adding, never replacing: the file is a copy from another browser, not the
 * truth about this one. A link whose address is already saved keeps whatever
 * the user made of it here, rather than being overwritten by an older idea of
 * itself from somewhere else (docs/concept.md §3.6).
 *
 * The file is the one thing in this extension that arrives from outside: the
 * picker takes whatever it is pointed at, and it could have been written by
 * hand. Nothing in it is therefore trusted as it stands.
 */
export async function importFile(contents: string): Promise<ImportOutcome> {
  const file = parseExportFile(contents);
  if (file.problem !== undefined) {
    return { status: 'failed', problem: file.problem };
  }

  const knownUrls = new Set((await getSavedLinks()).map((link) => link.url));
  const candidates = file.links.map(toSavedLink);
  const usable = candidates.filter((link): link is SavedLink => link !== null);
  const fresh = usable.filter((link) => !knownUrls.has(link.url));

  await mergeImportedData({
    links: fresh,
    categories: file.categories,
    tags: file.tags,
    customStatuses: file.customStatuses,
  });

  return {
    status: 'imported',
    added: fresh.length,
    duplicates: usable.length - fresh.length,
    unusable: candidates.length - usable.length,
  };
}

interface ParsedFile {
  problem?: ImportProblem;
  links: unknown[];
  categories: string[];
  tags: string[];
  customStatuses: string[];
}

const NOTHING = { links: [], categories: [], tags: [], customStatuses: [] };

function parseExportFile(contents: string): ParsedFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    return { problem: 'notReadable', ...NOTHING };
  }

  if (!isRecord(parsed) || parsed['format'] !== EXPORT_FORMAT) {
    return { problem: 'notOurFormat', ...NOTHING };
  }

  // A file from a newer version may hold fields this build knows nothing
  // about and would drop without a word, so it is refused rather than read
  // half-way. Older versions are read: that is what the version is for.
  const version = parsed['version'];
  if (typeof version !== 'number' || version > EXPORT_VERSION) {
    return { problem: 'tooNew', ...NOTHING };
  }

  const links = parsed['links'];

  return {
    links: Array.isArray(links) ? links : [],
    categories: asStringArray(parsed['categories']),
    tags: asStringArray(parsed['tags']),
    customStatuses: asStringArray(parsed['customStatuses']),
  };
}

/**
 * Rebuilds one link from whatever the file claims it was.
 *
 * Deliberately not a cast: the URL and the image go through the same checks a
 * freshly saved page gets, so a hand-edited file cannot smuggle in a
 * `javascript:` image or a link with no domain to file it under (§7.4).
 * Anything unusable becomes `null` and is counted, rather than landing
 * half-valid in storage.
 *
 * The id is not taken over. Ids only ever matter inside one browser, and a
 * fresh one cannot collide with something already stored here.
 */
function toSavedLink(raw: unknown): SavedLink | null {
  if (!isRecord(raw) || typeof raw['url'] !== 'string') {
    return null;
  }

  const link = createSavedLink({
    url: raw['url'],
    title: asString(raw['title']),
    imageUrl: typeof raw['imageUrl'] === 'string' ? raw['imageUrl'] : null,
    category: typeof raw['category'] === 'string' ? raw['category'] : null,
    tags: asStringArray(raw['tags']),
    status: asStatus(raw['status']),
    note: asString(raw['note']),
  });

  if (link === null) {
    return null;
  }

  // When the file remembers when this was saved, keep it: the model's "now"
  // is only a fallback, and importing should not make old finds look new.
  return {
    ...link,
    createdAt: asDate(raw['createdAt']) ?? link.createdAt,
    updatedAt: asDate(raw['updatedAt']) ?? link.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

/** Anything unrecognizable becomes undefined, which the model reads as the default. */
function asStatus(value: unknown): LinkStatus | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value['kind'] === 'custom' && typeof value['label'] === 'string') {
    return { kind: 'custom', label: value['label'] };
  }

  return value['kind'] === 'builtin' && value['key'] === 'default' ? DEFAULT_STATUS : undefined;
}

function asDate(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}
