/**
 * Background service worker.
 *
 * Its only responsibility (see docs/concept.md §3.2) is the toolbar badge: show
 * how many links are saved for the domain of the currently active tab.
 */
export default defineBackground(() => {
  // Badge handling is added together with the storage layer.
});
