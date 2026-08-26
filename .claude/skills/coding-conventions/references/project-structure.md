# Project structure (WXT convention)

Follow this structure; place new code in the matching location rather than inventing new
top-level folders:

```
entrypoints/
  popup/        UI entrypoint — quick view of links saved for the current domain
  dashboard/    UI entrypoint — full management view (all links, filters, search)
  background.ts Service worker — badge count logic, cross-part messaging
src/
  lib/          Shared logic: storage access, data model, filtering/search, URL/domain parsing
                incl. page-metadata.ts — the extraction function injected into the active tab
  components/   Reusable React components shared by popup and dashboard
  i18n/         Message catalogs (de.json, en.json), translation context and useTranslation hook
public/
  _locales/     Native manifest translations (extension name and description) per locale
```

- **There is deliberately no content script entrypoint.** Page metadata is read by a function
  injected into the active tab with `scripting.executeScript()` when the user saves, because a
  declarative content script would require `<all_urls>` host permissions. Do not add
  `entrypoints/content.ts` — see `docs/concept.md` §6.4 before proposing one.
- Storage access always goes through a shared module in `src/lib` (e.g., `src/lib/storage.ts`) —
  never call `storage.local` directly from a React component.
- New shared types (e.g., the saved-item data model) live in `src/lib` and are imported wherever
  needed, not redefined per file.
