import type { SavedLink } from './saved-link';
import { getCategories, getCustomStatuses, getSavedLinks, getTags } from './storage';

/**
 * Writing the wishlist out as a file (see docs/concept.md §3.6).
 *
 * There is no account and no sync, so a file the user carries themselves is
 * the only way this data reaches another browser — and the only backup that
 * exists at all. Reading such a file back in is the other half of §3.6 and
 * lives separately.
 */

/** Marks a file as ours, so any other JSON file can be told apart from it. */
export const EXPORT_FORMAT = 'universal-wishlist';

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

  return `universal-wishlist-${date}.json`;
}
