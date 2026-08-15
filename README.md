# Universal Wishlist

A cross-browser extension (Chrome, Firefox, Edge) that acts as a universal, shop-independent wishlist.

Save any page with a single click — no account, no sign-up. When you return to a domain where you
already saved something, the extension shows a badge with the number of saved links for that domain.
Saved items can be organized with categories, tags, a customizable status, and free-text notes.

All data is stored **locally in your browser** (`storage.local`). There is no backend, no account, and
no automatic sync. Data can be moved between browsers via manual JSON export/import.

## Project status

Early setup. The repository currently contains the product concept and the project conventions; the
WXT/React/TypeScript application code is being added next. The commands below describe the intended
toolchain and will work once the WXT project is scaffolded.

See [`docs/concept.md`](docs/concept.md) for the full product concept, feature list, and data model
(written in German).

## Tech stack

- [WXT](https://wxt.dev/) (Vite-based) — cross-browser manifest generation for Chrome, Firefox and Edge
- React + TypeScript for the Popup and Dashboard UI
- Tailwind CSS for styling
- Vitest for unit tests
- ESLint + Prettier for linting and formatting

## Setup

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
```

## Local development

```bash
npm run dev
```

This starts WXT in development mode, automatically launches a browser with the extension already
loaded, and hot-reloads on code changes. This is the fastest way to work on the extension.

To develop against a specific browser:

```bash
npm run dev -- -b firefox
npm run dev -- -b edge
```

## Building

```bash
npm run build            # default target (Chrome)
npx wxt build -b chrome
npx wxt build -b firefox
npx wxt build -b edge
```

Build output is written to `.output/<browser>-<manifest-version>/`, for example `.output/chrome-mv3/`.

## Testing a production build locally

No store publication is needed to try out a build.

**Chrome / Edge**

1. Run `npx wxt build -b chrome` (or `-b edge`).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the build folder, e.g. `.output/chrome-mv3`.

**Firefox**

1. Run `npx wxt build -b firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select the `manifest.json` inside the build folder,
   e.g. `.output/firefox-mv2/manifest.json`.

> Temporary add-ons are removed when Firefox restarts and have to be loaded again.

## Debugging

- **Popup:** right-click inside the opened popup and choose *Inspect*.
- **Background service worker:** open `chrome://extensions` and click the *Service Worker* link on the
  extension's card.
- **Content script:** use the regular page DevTools — content script output appears in the page console.

## Quality checks

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Vitest
```

These checks also run in CI on every push and pull request, together with a build for each target
browser.

## Privacy

The extension stores all data locally and never transmits it to any server. Only the minimum data
needed for the feature set is stored: page URL, title, preview image, detected price, and your own
input (category, tags, status, note). No tracking, no analytics, no cookies.

Exported files are plain, unencrypted JSON and may contain personal notes — handle them accordingly.

## Contributing

- `main` is the stable branch; work happens on feature branches merged via pull request.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/), written in English.
- All code, comments, and documentation are written in English.
- The UI must meet WCAG 2.2 Level AA.

Detailed project conventions live in [`.claude/skills/`](.claude/skills/).

## License

Not yet defined.
