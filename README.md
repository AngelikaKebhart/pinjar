# Universal Wishlist

[![CI](https://github.com/AngelikaKebhart/universal-wishlist/actions/workflows/ci.yml/badge.svg)](https://github.com/AngelikaKebhart/universal-wishlist/actions/workflows/ci.yml)

A cross-browser extension (Chrome, Firefox, Edge) that acts as a universal, shop-independent wishlist.

Save any page with a single click — no account, no sign-up. When you return to a domain where you
already saved something, the extension shows a badge with the number of saved links for that domain.
Saved items can be organized with categories, tags, a customizable status, and free-text notes.

All data is stored **locally in your browser** (`storage.local`). There is no backend, no account, and
no automatic sync. Data can be moved between browsers via manual JSON export/import.

The interface is available in **German and English**. It follows the browser language by default and
can be switched at any time in the Dashboard.

## Project status

Early development. The toolchain, the bilingual UI and the local storage layer are in place and
builds work for all three browsers, but the extension does not do anything useful yet: Popup and
Dashboard are still shells, and saving, badge handling and export/import are yet to be built.

See [`docs/concept.md`](docs/concept.md) for the full product concept, feature list, and data model
(written in German).

## Tech stack

- [pnpm](https://pnpm.io/) as the package manager (required — not npm, not yarn)
- [WXT](https://wxt.dev/) (Vite-based) — cross-browser manifest generation for Chrome, Firefox and Edge
- React + TypeScript for the Popup and Dashboard UI
- Tailwind CSS for styling
- Vitest for unit tests
- ESLint + Prettier for linting and formatting
- Own lightweight message catalogs for the bilingual UI — no external i18n library

## Setup

Requires [Node.js](https://nodejs.org/) 20 or newer and [pnpm](https://pnpm.io/).

This project uses **pnpm exclusively** — do not use `npm` or `yarn`. Only `pnpm-lock.yaml` is
versioned; a `package-lock.json` or `yarn.lock` appearing in the repository indicates an accidental
install with the wrong package manager and should be removed.

```bash
corepack enable    # once, if pnpm is not installed yet
pnpm install
```

## Local development

```bash
pnpm dev
```

This starts WXT in development mode, automatically launches a browser with the extension already
loaded, and hot-reloads on code changes. This is the fastest way to work on the extension.

To develop against a specific browser:

```bash
pnpm dev:firefox
pnpm dev:edge
```

## Building

```bash
pnpm build           # Chrome (default target)
pnpm build:firefox
pnpm build:edge
```

Build output is written to `.output/<browser>-<manifest-version>/`, for example `.output/chrome-mv3/`.

## Testing a production build locally

No store publication is needed to try out a build.

**Chrome / Edge**

1. Run `pnpm build` (or `pnpm build:edge`).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the build folder, e.g. `.output/chrome-mv3`.

**Firefox**

1. Run `pnpm build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select the `manifest.json` inside the build folder,
   e.g. `.output/firefox-mv2/manifest.json`.

> Temporary add-ons are removed when Firefox restarts and have to be loaded again.

## Debugging

- **Popup:** right-click inside the opened popup and choose _Inspect_.
- **Dashboard:** it is a normal browser tab — use the regular page DevTools.
- **Background service worker:** open `chrome://extensions` and click the _Service Worker_ link on the
  extension's card.
- **Injected page scripts:** page metadata is read by a script injected on demand into the active tab;
  its output appears in the DevTools console of that page, not in the extension's own console.

## Quality checks

```bash
pnpm lint          # ESLint (incl. jsx-a11y accessibility rules)
pnpm typecheck     # TypeScript
pnpm test          # Vitest
pnpm format        # Prettier, write
pnpm format:check  # Prettier, verify only
pnpm audit         # Known vulnerabilities in dependencies
```

All of these also run in CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) on every push to
`main` and on every pull request, alongside a separate build job for Chrome, Firefox and Edge. The
checks continue after a failure, so one run reports every problem rather than one per push.

Note that GitHub does not enforce these checks as a merge requirement on private repositories in the
free plan — a red run is visible, but it does not block the merge.

### Accepted audit findings

`pnpm audit` currently reports two denial-of-service advisories in `image-size`, reached only through
`web-ext > addons-linter`. They are listed under `auditConfig.ignoreGhsas` in
[`pnpm-workspace.yaml`](pnpm-workspace.yaml), so the command exits successfully while still printing
them as ignored.

They are accepted rather than fixed because `addons-linter` pins `image-size` to exactly `2.0.2` and
the first patched release (`2.0.3`) is not published yet — there is no version to upgrade to.
`web-ext` is a devDependency, never ships in the built extension, and only parses our own icon files.

**Remove both entries once `image-size >= 2.0.3` is released and `addons-linter` picks it up.** Never
silence a finding without a written reason and a condition for removing it again — an exception list
that nobody prunes turns the audit into noise.

## Translations

The UI ships in German and English. Two separate mechanisms are involved, because they answer
different questions:

| What                                   | Where                    | Language decided by                    |
| -------------------------------------- | ------------------------ | -------------------------------------- |
| Extension name and description (store) | `public/_locales/<lang>` | the browser, natively — not switchable |
| Everything inside Popup and Dashboard  | `src/i18n/<lang>.json`   | the user's choice, stored locally      |

The native `browser.i18n` API cannot be switched at runtime, which is why the UI does not use it and
relies on own message catalogs instead. See [`docs/concept.md`](docs/concept.md) §6.3 for the
reasoning.

**When adding UI text:**

- Never write a literal string into a component. Add a key and resolve it through `useTranslation()`.
- This includes text that is never seen: `alt`, `aria-label`, `title`, placeholders, error messages.
- Add the key to **both** `de.json` and `en.json` in the same change — a test fails if the two
  catalogs do not hold exactly the same keys.
- Keys are English and descriptive (`popup.saveButton`, not `btn1`). Only the values are translated.
- Plural forms are two keys sharing a base, suffixed `_one` and `_other`, resolved through
  `Intl.PluralRules`: `plural('dashboard.savedLinks.count', n)`. Underscores are reserved for this;
  regular key segments are separated by dots.
- Dates and numbers go through `formatDate()` / `formatNumber()` from the same hook, never through
  hand-built strings.
- Do not translate what the user typed (categories, tags, notes, custom status values) or what came
  from a website (title).
- Check new UI in both languages: German runs roughly 20–35% longer than English and will expose any
  fixed width that clips.

## Privacy

The extension stores all data locally and never transmits it to any server. Only the minimum data
needed for the feature set is stored: page URL, title, preview image, your own input
(category, tags, status, note), and your chosen interface language. No tracking, no analytics, no
cookies. Translations are part of the installed bundle — no translation service is ever contacted.

Exported files are plain, unencrypted JSON and may contain personal notes — handle them accordingly.

## Contributing

- `main` is the stable branch; work happens on feature branches merged via pull request.
  A `pre-push` hook in [`.githooks/`](.githooks/) rejects direct pushes to `main`. It is activated by
  `pnpm install`; to enable it manually, run `git config core.hooksPath .githooks`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/), written in English.
- All code, comments, and documentation are written in English — user-facing text is the one
  exception and lives in the translation catalogs (see [Translations](#translations)).
- The UI must meet WCAG 2.2 Level AA.

Detailed project conventions live in [`.claude/skills/`](.claude/skills/).

## License

Not yet defined.
