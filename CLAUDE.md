# CLAUDE.md

This file provides project-level guidance to Claude Code when working in this repository.

## Project

A cross-browser extension (Chrome, Firefox, Edge) that acts as a universal, shop-independent wishlist/bookmark manager. Users save links from any website with one click; the extension shows a badge indicator on domains where something was already saved, and lets users organize saved items with categories, tags, notes, and a customizable status.

The user interface is offered in **German and English**. It starts in the browser's language and can be switched manually in the Dashboard. Note the split this creates: the code stays English-only, while every user-facing string lives in a translation catalog — see the `coding-conventions` skill.

Full product concept, feature list, data model, and rationale:
@docs/concept.md

## Tech stack

- **Package manager: [pnpm](https://pnpm.io/)** — required for this project (not npm, not yarn)
- [WXT](https://wxt.dev/) (Vite-based) as the extension framework — cross-browser Manifest generation for Chrome/Firefox/Edge
- React + TypeScript for the UI (Popup and Dashboard)
- Tailwind CSS for styling
- Vitest for unit tests
- ESLint + Prettier for linting/formatting
- Local-only storage (`storage.local`), no backend, no account — data portability via manual export/import
- Bilingual UI (de/en) via own lightweight message catalogs in `src/i18n/`, plus native `_locales/` for the manifest and store listing — no external i18n library (see `docs/concept.md` §6.3 for why `browser.i18n` alone is not enough)

## Conventions

Detailed conventions are encoded as project skills under `.claude/skills/` and are applied automatically by Claude Code when relevant — see there for the full rules. In short:

- **`coding-conventions`** — all code (names, comments, commit messages, docs) is written in English, regardless of the language used in conversation; no user-facing string is ever hardcoded, it goes into the de/en catalogs; Clean Code principles; WXT project structure; and after any larger change, an audit of the surrounding tests for ones that still pass but are no longer the right tests
- **`accessibility-wcag`** — all UI must meet WCAG 2.2 Level AA, including a correct `<html lang>` for the active language and layouts that survive longer German text
- **`privacy-and-security`** — GDPR/DSGVO-friendly data handling (local-only, minimal data, full user control) and security rules (untrusted webpage data, minimal permissions, no remote code, dependency hygiene)
- **`git-workflow`** — Conventional Commits in English, trunk-based branching, GitHub Actions CI, Semantic Versioning

Do not duplicate these rules here — consult the skills, they stay up to date independently of this file.

## Quick reference

- Install dependencies: `pnpm install`
- Start local dev: `pnpm dev` (auto-launches a browser with the extension loaded, hot reload)
- Build per browser: `pnpm build -b chrome` / `pnpm build -b firefox` / `pnpm build -b edge` (or `pnpm wxt build -b <browser>`, depending on how scripts are set up)
- See `docs/concept.md` §9 for detailed local-testing/debugging steps, and the README once it exists

## Driving the extension in a real browser

Claude Code can load and operate the extension itself through the `chrome-devtools`
MCP server configured in `.mcp.json`. The server has to be approved once per machine
(`/mcp`, or the prompt shown when a session starts); until then none of its tools exist.

The workflow is always:

1. `pnpm build` — `install_extension` reads `.output/chrome-mv3` from disk, so a stale
   build is silently tested instead of the current code. The WXT dev server is not involved.
2. `install_extension` with the absolute path to `.output/chrome-mv3`, then
   `list_extensions` to get the generated extension ID.
3. Reach the UI as regular tabs: `chrome-extension://<id>/popup.html` and
   `chrome-extension://<id>/dashboard.html`.

Three constraints are worth knowing before writing a test plan:

- **Chrome's `--load-extension` flag no longer works** (disabled since Chrome 137, and the
  `DisableLoadExtensionCommandLineSwitch` escape hatch is gone as of Chrome 151). Loading
  over CDP via `install_extension` is the only remaining route, which is why
  `--categoryExtensions=true` is set in `.mcp.json`.
- **The popup bubble itself cannot be inspected.** `trigger_extension_action` clicks the
  toolbar icon, but the bubble never becomes a debuggable page. Opened as a tab instead,
  the popup has no meaningful "current tab" — the save button is correctly disabled there.
  Popup layout, translations and accessibility are testable this way; the save flow is not.
  Test that one against the background service worker or against pre-seeded storage.
- **The browser is restricted to a URL allowlist** (`--allowedUrlPattern`), and the
  extension's own pages have to be part of it or navigating to them fails outright. Chrome
  derives the ID of an unpacked extension from its folder path, so the entry currently in
  `.mcp.json` stays valid — but moving `.output/chrome-mv3` changes the ID and silently
  breaks every test. Read the ID back from `list_extensions` when that happens.

`take_snapshot` returns the accessibility tree, which makes it the better tool than
`take_screenshot` for checking landmarks, live regions and label association.
