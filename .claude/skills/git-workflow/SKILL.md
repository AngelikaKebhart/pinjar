---
name: git-workflow
description: Defines this project's Git and GitHub conventions — Conventional Commits written in English, trunk-based branching with feature branches and pull requests into main, .gitignore rules, README requirements (including local-testing instructions), GitHub Actions CI (lint, typecheck, test, multi-browser build), and Semantic Versioning for releases. Apply this skill whenever creating commits, branches, pull requests, CI/CD workflow files, README content, or handling versioning/release tasks in this project.
---

# Git & GitHub Workflow

## Branching

- `main` is the stable, always-working branch.
- New work happens on feature branches, named descriptively, e.g. `feature/tagging`, `feature/dashboard-filter`, `fix/domain-detection`.
- Feature branches are merged into `main` via Pull Request, not pushed directly to `main`.
- **Once a branch is merged, never commit to it again.** Create a new feature branch for any new work. Merged branches are closed; treat them as read-only to keep history clean and prevent confusion.

## Commit messages: Conventional Commits, in English

Use the [Conventional Commits](https://www.conventionalcommits.org/) format, written in English regardless of what language the task was discussed in:

```
<type>: <short summary>

[optional longer body]
```

Common types: `feat` (new feature), `fix` (bug fix), `chore` (tooling/deps), `refactor`, `test`, `docs`, `style`.

Examples:
- `feat: add tag filter to dashboard`
- `fix: correct domain detection for trailing dots`
- `chore: update dependencies`
- `docs: add local testing instructions to README`

This enables automated changelog generation later and keeps history scannable.

## .gitignore

Must exclude at minimum: `node_modules/`, the WXT build output directory (`.output/`), and any `.env` file if one is introduced later.

## README requirements

The README.md must include, in English:

- A short project description
- Setup instructions (install dependencies, start local dev server via WXT)
- Build instructions per target browser
- **Local testing instructions** without store publication:
  - `pnpm dev` for the WXT dev mode (auto-launches a browser with the extension loaded, hot reload)
  - Loading an unpacked production build in Chrome/Edge (`chrome://extensions` / `edge://extensions`, enable developer mode, "Load unpacked", point at e.g. `.output/chrome-mv3`)
  - Loading a temporary add-on in Firefox (`about:debugging#/runtime/this-firefox`, "Load Temporary Add-on", point at the `manifest.json` in e.g. `.output/firefox-mv2`; note that it's removed on Firefox restart)
  - Per-browser build commands: `wxt build -b chrome`, `wxt build -b firefox`, `wxt build -b edge`
  - Debugging tips: inspecting the popup, the background service worker (via `chrome://extensions`), and the script injected into the visited page (regular page DevTools console)
- Notes on running lint/typecheck/tests

## CI (GitHub Actions)

Every push and pull request should trigger a workflow that runs, at minimum:

1. Linting (ESLint)
2. Type checking (TypeScript)
3. Tests (Vitest)
4. A build for each target browser (Chrome, Firefox, Edge) to catch build breakage early

## Versioning & Releases

- Follow [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) in `package.json` and the generated manifest.
- Tag releases in Git; use GitHub Releases to track them.
- Once the project is ready for store publication, a release workflow can build store-ready zip files per browser (WXT supports this natively) and attach them to the GitHub Release automatically — set this up when publication is actually planned, not before.
