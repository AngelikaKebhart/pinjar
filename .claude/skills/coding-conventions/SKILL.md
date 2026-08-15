---
name: coding-conventions
description: Enforces this project's core coding conventions — English-only code (variable/function/file names, comments, commit messages, and documentation), Clean Code principles (small single-responsibility functions, clear separation of concerns, no duplication, meaningful naming, sensible error handling), and the established WXT + React + TypeScript project structure. Apply this skill whenever writing, editing, reviewing, or refactoring ANY code, file, or piece of documentation in this project — including comments and commit messages — not just when the user explicitly asks about "conventions" or "clean code". This is a foundational, always-relevant skill for this codebase.
---

# Coding Conventions

This project is a cross-browser bookmarking/wishlist extension (WXT + React + TypeScript). These conventions apply to every file written or touched in this repository.

## 1. Language: English only

- ALL code artifacts must be in English, regardless of the language used to discuss or plan the project: variable names, function names, class names, file names, folder names, code comments, JSDoc/TSDoc, commit messages, PR titles/descriptions, README and any other repository documentation.
- Do not mix languages within identifiers or comments (no "getBenutzerDaten", no German comments even if the surrounding conversation is in German).
- If the user communicates in German (or any other language) while requesting a feature, still produce English code, comments, and commit messages.

## 2. Clean Code principles

- **Naming**: use descriptive, unambiguous names. Prefer `extractPageMetadata()` over `getData()`. Booleans read as predicates (`isSaved`, `hasTags`).
- **Single Responsibility**: keep functions small and focused on one task. If a function needs "and" to describe what it does, split it.
- **Separation of concerns** — keep these layers distinct and do not mix their responsibilities:
  - Storage access (reading/writing saved items) — pure data layer, no UI or DOM concerns
  - UI logic (Popup, Dashboard components) — no direct storage calls from deep inside components; go through the storage/data layer
  - Content-script logic (metadata extraction from the visited page) — read-only, never executes page code
  - Background/service-worker logic (badge count management, messaging between parts of the extension)
- **No duplication**: shared logic (storage helpers, URL/domain parsing, filtering) belongs in `src/lib` or `src/utils`, not copy-pasted across entrypoints.
- **Error handling**: failures in optional extraction (title, image, price) must never block saving a link — degrade gracefully (e.g., missing price stays `null`, user can fill it in manually).
- **Comments**: only where the code itself isn't self-explanatory (e.g., a non-obvious heuristic for price detection). Don't restate what the code already says.
- Use ESLint + Prettier; do not hand-format code that a formatter would reformat differently.

## 3. Project structure (WXT convention)

Follow this structure; place new code in the matching location rather than inventing new top-level folders:

```
entrypoints/
  popup/        UI entrypoint — quick view of links saved for the current domain
  dashboard/    UI entrypoint — full management view (all links, filters, search)
  background.ts Service worker — badge count logic, cross-part messaging
  content.ts    Content script — page metadata extraction (title, og:image, price heuristics)
src/
  lib/          Shared logic: storage access, data model, filtering/search, URL/domain parsing
  components/   Reusable React components shared by popup and dashboard
```

- Storage access always goes through a shared module in `src/lib` (e.g., `src/lib/storage.ts`) — never call `storage.local` directly from a React component.
- New shared types (e.g., the saved-item data model) live in `src/lib` and are imported wherever needed, not redefined per file.

## 4. When reviewing or refactoring

When asked to review, refactor, or clean up code in this project, check specifically for: non-English identifiers/comments, functions doing more than one thing, storage calls made directly from UI components, and duplicated logic that should be extracted into `src/lib`.
