import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

/**
 * Firefox-only manifest keys.
 *
 * Firefox requires a stable add-on ID, and since November 2025 also an explicit
 * data collection declaration. The extension stores everything locally and
 * transmits nothing, so "none" is declared.
 */
const firefoxSettings = {
  gecko: {
    id: 'universal-wishlist@angelikakebhart.github.io',
    data_collection_permissions: {
      required: ['none'],
    },
  },
};

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => ({
    // Resolved by the browser from public/_locales. This mechanism follows the
    // browser language and cannot be switched at runtime — which is right for
    // the store listing, and why the UI uses its own catalogs instead
    // (see docs/concept.md §6.3).
    default_locale: 'en',
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    // Keep permissions minimal (see .claude/skills/privacy-and-security):
    // "storage" for the local wishlist, and "activeTab" + "scripting" to read the
    // metadata of the current page only when the user actively saves it.
    //
    // "tabs" is what the badge costs. Reading the address of a tab requires it;
    // "activeTab" only ever covers a tab the user just clicked the icon on,
    // which is the very click the badge exists to spare them. Browsers show
    // this as "read your browsing history" on install. Deliberate trade-off:
    // the domain indicator is a core feature (docs/concept.md §3.2), and "tabs"
    // is the narrowest permission that delivers it — a host permission would
    // additionally grant access to page content, which we do not want.
    //
    // Still no host permission, so the extension has no standing access to the
    // content of any website.
    permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
    ...(browser === 'firefox' ? { browser_specific_settings: firefoxSettings } : {}),
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
