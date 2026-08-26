import { browser } from 'wxt/browser';
import { translate, translatePlural } from '@/src/i18n/format';
import { resolveLanguage } from '@/src/i18n/language';
import { CATALOGS, type Language } from '@/src/i18n/messages';
import { languagePreference } from './settings';
import { countSavedLinksForDomain } from './storage';
import { extractDomain } from './url';

/**
 * The toolbar badge: how many links are saved for the site shown in a tab
 * (docs/concept.md §3.2).
 *
 * Set per tab, not globally: the browser then shows each tab its own number,
 * which is correct when two tabs sit on different sites and cheaper than
 * tracking which tab is in front.
 *
 * Reading the address of a tab the user has not clicked the icon on requires
 * the "tabs" permission — `activeTab` only covers a tab the user just acted on,
 * which is exactly the click the badge is meant to save.
 */

/** Above this the badge would be cut off; the exact number is in the popup. */
const MAX_DISPLAYED_COUNT = 99;

/** White text on this reaches 6.7:1, above the 4.5:1 of WCAG 2.2 AA. */
const BADGE_BACKGROUND_COLOR = '#1d4ed8';
const BADGE_TEXT_COLOR = '#ffffff';

/** Firefox is built as MV2, where the toolbar button is still `browserAction`. */
const toolbarAction = browser.action ?? browser.browserAction;

/** What we know about a tab; `browser.tabs` hands us plenty more. */
interface BadgedTab {
  id?: number;
  url?: string;
}

/**
 * Sets the badge colors once, for every tab. Called from the background worker
 * on every start: the colors do not survive a restart, and the browser's own
 * default is neither ours nor guaranteed to pass contrast.
 */
export async function applyBadgeAppearance(): Promise<void> {
  await toolbarAction.setBadgeBackgroundColor({ color: BADGE_BACKGROUND_COLOR });
  // Only from Chrome 110; without it the browser picks a readable color itself.
  await toolbarAction.setBadgeTextColor?.({ color: BADGE_TEXT_COLOR });
}

/** Brings one tab's badge in line with what is saved for its domain. */
export async function refreshBadgeForTab(tab: BadgedTab): Promise<void> {
  await updateBadge(tab, await resolveActiveLanguage());
}

/**
 * Brings every open tab's badge up to date: on startup, and whenever something
 * changed that affects all tabs at once — a saved or deleted link, or a switch
 * of the interface language.
 */
export async function refreshAllBadges(): Promise<void> {
  const [tabs, language] = await Promise.all([browser.tabs.query({}), resolveActiveLanguage()]);

  await Promise.all(tabs.map((tab) => updateBadge(tab, language)));
}

async function updateBadge(tab: BadgedTab, language: Language): Promise<void> {
  // A tab without an id cannot be addressed — it is being discarded.
  if (tab.id === undefined) {
    return;
  }

  const count = await countLinksForAddress(tab.url);

  await Promise.all([
    toolbarAction.setBadgeText({ tabId: tab.id, text: formatBadgeText(count) }),
    toolbarAction.setTitle({ tabId: tab.id, title: describeCount(language, count) }),
  ]);
}

/**
 * Browser-internal pages and anything that is not http(s) have no domain to
 * count links for, and neither does a tab whose address we cannot see.
 */
async function countLinksForAddress(url: string | undefined): Promise<number> {
  const domain = url === undefined ? null : extractDomain(url);
  return domain === null ? 0 : countSavedLinksForDomain(domain);
}

/** No badge at all when nothing is saved — a "0" would be noise on every tab. */
function formatBadgeText(count: number): string {
  if (count === 0) {
    return '';
  }

  return count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(count);
}

/**
 * The tooltip carries the count for anyone who cannot see the badge: badge text
 * is drawn onto the icon and never announced (WCAG 2.2 AA, 1.1.1).
 */
function describeCount(language: Language, count: number): string {
  const catalog = CATALOGS[language];

  return count === 0
    ? translate(catalog, 'badge.tooltip.none')
    : translatePlural(catalog, language, 'badge.tooltip.count', count);
}

async function resolveActiveLanguage(): Promise<Language> {
  return resolveLanguage(await languagePreference.getValue(), navigator.language);
}
