import { applyBadgeAppearance, refreshAllBadges, refreshBadgeForTab } from '@/src/lib/badge';
import { languagePreference } from '@/src/lib/settings';
import { savedLinks } from '@/src/lib/storage';

/**
 * Background service worker.
 *
 * Its only responsibility (see docs/concept.md §3.2) is the toolbar badge: show
 * how many links are saved for the domain of the tab the user is looking at.
 * The counting itself lives in `src/lib/badge`; this file only decides when it
 * has to happen.
 *
 * The body runs again every time the worker is woken up, which is why it starts
 * by bringing all badges up to date rather than assuming they survived.
 */
export default defineBackground(() => {
  void applyBadgeAppearance();
  void refreshAllBadges();

  // `url` is only set when the address actually changed; `status` catches a tab
  // that finishes loading without one, e.g. when it is restored from a session.
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url === undefined && changeInfo.status !== 'complete') {
      return;
    }

    void refreshBadgeForTab(tab);
  });

  // Saving or deleting a link changes the count for every tab on that domain,
  // and the language decides the wording of the tooltip.
  savedLinks.watch(() => void refreshAllBadges());
  languagePreference.watch(() => void refreshAllBadges());
});
