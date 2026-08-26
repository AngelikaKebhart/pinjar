import { browser } from 'wxt/browser';
import { extractPageMetadata, type PageMetadata } from './page-metadata';
import type { SavedLink } from './saved-link';
import { addSavedLink, findSavedLinkByUrl } from './storage';
import { extractDomain } from './url';

/**
 * Everything about "the page the user is looking at right now": which tab is
 * active, what can be read out of it, and handing that to storage.
 *
 * Produces no user-facing text — it reports what happened and lets the popup
 * put it into words in the active language.
 */

/** The active tab, reduced to what saving needs. */
export interface CurrentPage {
  tabId: number;
  url: string;
  /** The tab's own title, already known without reading the page. */
  title: string;
  /** `null` when this page cannot be saved at all. */
  domain: string | null;
}

export type SaveOutcome =
  | { status: 'saved'; link: SavedLink }
  | { status: 'alreadySaved'; link: SavedLink }
  /** A browser page, a local file, anything that is not http(s). */
  | { status: 'unsupportedPage' }
  | { status: 'failed' };

const NO_METADATA: PageMetadata = { title: '', imageUrl: null };

/** Describes the tab the popup was opened over, or `null` if there is none. */
export async function getCurrentPage(): Promise<CurrentPage | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (tab?.id === undefined || tab.url === undefined) {
    return null;
  }

  return {
    tabId: tab.id,
    url: tab.url,
    title: tab.title ?? '',
    domain: extractDomain(tab.url),
  };
}

/**
 * Saves the page, enriched with what can be read from it. Saving the same
 * address twice would leave the user with two entries to tell apart, so an
 * existing one is reported back instead.
 */
export async function saveCurrentPage(page: CurrentPage): Promise<SaveOutcome> {
  if (page.domain === null) {
    return { status: 'unsupportedPage' };
  }

  const existing = await findSavedLinkByUrl(page.url);
  if (existing !== null) {
    return { status: 'alreadySaved', link: existing };
  }

  const metadata = await readPageMetadata(page.tabId);

  const link = await addSavedLink({
    url: page.url,
    // The page's own title beats the tab's, which is what remains when the
    // page cannot be read.
    title: metadata.title === '' ? page.title : metadata.title,
    imageUrl: metadata.imageUrl,
  });

  return link === null ? { status: 'failed' } : { status: 'saved', link };
}

/**
 * Runs the extraction in the given tab. Failure is expected rather than
 * exceptional — the browser refuses injection on its own pages, on PDFs, and on
 * a tab that navigated away — and none of it may stop the user from saving, so
 * it degrades to "nothing extracted" (docs/concept.md §7.1).
 */
async function readPageMetadata(tabId: number): Promise<PageMetadata> {
  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId },
      func: extractPageMetadata,
    });

    return injection?.result ?? NO_METADATA;
  } catch {
    return NO_METADATA;
  }
}
