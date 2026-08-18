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
