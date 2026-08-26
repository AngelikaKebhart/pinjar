import { applyBadgeAppearance, refreshAllBadges, refreshBadgeForTab } from '@/src/lib/badge';
import { languagePreference } from '@/src/lib/settings';
import { savedLinks } from '@/src/lib/storage';

/**
 * Background service worker.
 *
 * Its only responsibility (docs/concept.md §3.2) is the toolbar badge: how many
 * links are saved for the domain of the tab in view. The counting lives in
 * `src/lib/badge`; this file only decides when it has to happen — and since the
 * body runs again on every wake-up, it starts by refreshing all badges rather
 * than assuming they survived.
 *
 * `persistent: false` only reaches the Firefox build, which is MV2 and would
 * otherwise hold this page in memory for the whole browser session; there is
 * nothing to keep alive, as every listener starts from what is in storage.
 * Chrome and Edge are MV3, where a service worker is the only option anyway.
 */
export default defineBackground({
  persistent: false,

  main() {
    void applyBadgeAppearance();
    void refreshAllBadges();

    // `url` is only set when the address actually changed; `status` catches a
    // tab that finishes loading without one, e.g. restored from a session.
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
  },
});
