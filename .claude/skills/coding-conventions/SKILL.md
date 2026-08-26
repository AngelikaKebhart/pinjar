---
name: coding-conventions
description: Enforces this project's core coding conventions — English-only code (variable/function/file names, comments, commit messages, and documentation), a bilingual German/English user interface where no user-facing string is ever hardcoded, Clean Code principles (small single-responsibility functions, clear separation of concerns, no duplication, meaningful naming, sensible error handling), and the established WXT + React + TypeScript project structure. Also requires auditing the surrounding tests after any larger change — rewritten components, changed interactions, moved responsibilities — for tests that still pass but no longer assert the right thing, have become redundant, sit at the wrong level, or left unused translation keys and helpers behind. Apply this skill whenever writing, editing, reviewing, or refactoring ANY code, file, or piece of documentation in this project — including comments, commit messages, and any text a user will see — not just when the user explicitly asks about "conventions", "clean code", "tests", or "translations". This is a foundational, always-relevant skill for this codebase.
---

# Coding Conventions

This project is a cross-browser bookmarking/wishlist extension (WXT + React + TypeScript). These conventions apply to every file written or touched in this repository.

## 0. Package manager: pnpm only

This project uses **pnpm** exclusively. Never use `npm install`/`npm run` or `yarn` commands or instructions — always `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm add <pkg>`, `pnpm audit`, etc. Never commit a `package-lock.json` or `yarn.lock`; only `pnpm-lock.yaml` is versioned. If you encounter a `package-lock.json`/`yarn.lock` in the repo, flag it — it indicates an accidental npm/yarn install and should be removed.

## 1. Language: English code, bilingual UI

Two rules that must not be confused with each other: **everything a developer reads is English; everything a user reads exists in German and English.**

### 1a. Code and repository artifacts: English only

- ALL code artifacts must be in English, regardless of the language used to discuss or plan the project: variable names, function names, class names, file names, folder names, code comments, JSDoc/TSDoc, commit messages, PR titles/descriptions, README and any other repository documentation.
- Do not mix languages within identifiers or comments (no "getBenutzerDaten", no German comments even if the surrounding conversation is in German).
- If the user communicates in German (or any other language) while requesting a feature, still produce English code, comments, and commit messages.

### 1b. User-facing text: German and English

The extension ships a fully bilingual UI (see `docs/concept.md` §3.7 and §6.3). The language follows the browser by default and can be switched manually in either surface — Popup and Dashboard share one header carrying that switch.

- **Never hardcode a user-facing string in a component.** Always reference a translation key and resolve it through the `useTranslation()` hook. A literal like `<button>Save</button>` is a bug, not a placeholder to fix later.
- This includes text that is not visible on screen: `alt` attributes, `aria-label`/`aria-describedby`, `title` attributes, `<option>` labels, placeholder text, error and confirmation messages, and document titles.
- **Translation keys are English and descriptive**, following the UI area they belong to: `popup.saveButton`, `dashboard.filter.byCategory`, `errors.importInvalidFile`. Never `btn1`, never a German key like `popup.speichernButton`. Only the *values* in the catalogs are translated.
- **Add every new key to both `src/i18n/de.json` and `src/i18n/en.json` in the same change.** A key present in only one language is an incomplete change — a unit test enforces that both catalogs hold exactly the same key set.
- **Do not translate user-entered or page-sourced data**: categories, tags, custom status values, notes, and the title extracted from a website stay exactly as they were entered or captured.
- **Locale-aware formatting** goes through the native `Intl` API (`Intl.DateTimeFormat`, `Intl.NumberFormat`) with the active language — never hand-built date or number strings.
- The extension name and description are translated separately through the native `_locales` mechanism under `public/_locales/`, because that is what the browser and the store listing read.

## 2. Clean Code principles

- **Naming**: use descriptive, unambiguous names. Prefer `extractPageMetadata()` over `getData()`. Booleans read as predicates (`isSaved`, `hasTags`).
- **Single Responsibility**: keep functions small and focused on one task. If a function needs "and" to describe what it does, split it.
- **Separation of concerns** — keep these layers distinct and do not mix their responsibilities:
  - Storage access (reading/writing saved items) — pure data layer, no UI or DOM concerns
  - UI logic (Popup, Dashboard components) — no direct storage calls from deep inside components; go through the storage/data layer
  - Page extraction logic (metadata read from the visited page by the injected script) — read-only, never executes page code
  - Background/service-worker logic (badge count management, messaging between parts of the extension)
- **No duplication**: shared logic (storage helpers, URL/domain parsing, filtering) belongs in `src/lib` or `src/utils`, not copy-pasted across entrypoints.
- **Error handling**: failures in optional extraction (title, image) must never block saving a link — degrade gracefully (e.g., a missing image stays `null`, the user can fill it in manually).
- **Comments**: only where the code itself isn't self-explanatory (e.g., a non-obvious extraction heuristic). Don't restate what the code already says.
- **No price field**: the data model deliberately has no price, and nothing extracts one — a price would narrow the extension to shops, and automatic detection is unreliable. Do not reintroduce one without an explicit decision (see `docs/concept.md` §3.1).
- Use ESLint + Prettier; do not hand-format code that a formatter would reformat differently.

## 3. Project structure (WXT convention)

Follow this structure; place new code in the matching location rather than inventing new top-level folders:

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

- **There is deliberately no content script entrypoint.** Page metadata is read by a function injected into the active tab with `scripting.executeScript()` when the user saves, because a declarative content script would require `<all_urls>` host permissions. Do not add `entrypoints/content.ts` — see `docs/concept.md` §6.4 before proposing one.
- Storage access always goes through a shared module in `src/lib` (e.g., `src/lib/storage.ts`) — never call `storage.local` directly from a React component.
- New shared types (e.g., the saved-item data model) live in `src/lib` and are imported wherever needed, not redefined per file.

## 4. When reviewing or refactoring

When asked to review, refactor, or clean up code in this project, check specifically for: non-English identifiers/comments, hardcoded user-facing strings that should be translation keys, translation keys added to only one catalog, functions doing more than one thing, storage calls made directly from UI components, and duplicated logic that should be extracted into `src/lib`.

## 5. After any larger change: audit the tests

**Whenever a change reshapes how something works — a rewritten component, a changed interaction, a moved responsibility, a new abstraction that replaces old ones — go back over the tests around it before calling the work done.** A green suite is not evidence that the tests are still the right tests. This is a required step, not an optional tidy-up, and it belongs in the same commit or an adjacent one, never "later".

Tests that contradict the new behaviour fail loudly and get fixed on their own. The ones worth hunting are those that still pass:

- **Tests that now assert the wrong thing.** A test kept alive by editing selectors and values until it went green again may no longer describe behaviour anyone wants. Ask what would break in the product if this test failed — if the answer is "nothing a user would notice", it is testing the implementation.
- **Tests made redundant by a better one.** After adding a test that plays a workflow through, older tests that poked at one intermediate step of it are often dead weight. Prefer the test that covers the user-visible consequence, and keep the cheap unit test underneath it; drop what sits in between.
- **Tests at the wrong level.** Reaching through the full UI to assert a storage key, or rendering a component to check a pure function, is the most expensive way to learn the least. If a unit test already covers the mechanism and an integration test covers the visible result, the one in the middle can go.
- **Tests that now enshrine sloppiness.** If a test had to be updated to expect something odd — an empty string in a list, a value that is trimmed elsewhere — decide whether the odd value is genuinely the contract, and say so in a comment, or fix the code instead of the expectation.
- **What the change left behind.** Unused translation keys, helpers, fixtures and test utilities that nothing calls any more. Unused catalog keys are easy to miss because the key-parity test only compares `de.json` against `en.json`; it never asks whether anything uses a key. Check them against the non-test sources.

Report what was removed and why, and say explicitly which near-duplicates were kept and what distinguishes them — a deletion nobody can second-guess is a deletion nobody can catch when it was wrong.
