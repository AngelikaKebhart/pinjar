# CLAUDE.md

This file provides project-level guidance to Claude Code when working in this repository.

## Project

A cross-browser extension (Chrome, Firefox, Edge) that acts as a universal, shop-independent wishlist/bookmark manager. Users save links from any website with one click; the extension shows a badge indicator on domains where something was already saved, and lets users organize saved items with categories, tags, notes, and a customizable status.

Full product concept, feature list, data model, and rationale:
@docs/concept.md

## Tech stack

- [WXT](https://wxt.dev/) (Vite-based) as the extension framework — cross-browser Manifest generation for Chrome/Firefox/Edge
- React + TypeScript for the UI (Popup and Dashboard)
- Tailwind CSS for styling
- Vitest for unit tests
- ESLint + Prettier for linting/formatting
- Local-only storage (`storage.local`), no backend, no account — data portability via manual export/import

## Conventions

Detailed conventions are encoded as project skills under `.claude/skills/` and are applied automatically by Claude Code when relevant — see there for the full rules. In short:

- **`coding-conventions`** — all code (names, comments, commit messages, docs) is written in English, regardless of the language used in conversation; Clean Code principles; WXT project structure
- **`accessibility-wcag`** — all UI must meet WCAG 2.2 Level AA
- **`privacy-and-security`** — GDPR/DSGVO-friendly data handling (local-only, minimal data, full user control) and security rules (untrusted webpage data, minimal permissions, no remote code, dependency hygiene)
- **`git-workflow`** — Conventional Commits in English, trunk-based branching, GitHub Actions CI, Semantic Versioning

Do not duplicate these rules here — consult the skills, they stay up to date independently of this file.

## Quick reference

- Start local dev: `npm run dev` (auto-launches a browser with the extension loaded, hot reload)
- Build per browser: `wxt build -b chrome` / `wxt build -b firefox` / `wxt build -b edge`
- See `docs/concept.md` §9 for detailed local-testing/debugging steps, and the README once it exists
