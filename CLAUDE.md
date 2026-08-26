# CLAUDE.md

This file provides project-level guidance to Claude Code when working in this repository.

## Project

A cross-browser extension (Chrome, Firefox, Edge) that acts as a universal, shop-independent wishlist/bookmark manager. Users save links from any website with one click; the extension shows a badge indicator on domains where something was already saved, and lets users organize saved items with categories, tags, notes, and a customizable status.

The user interface is offered in **German and English**. It starts in the browser's language and can be switched manually in either surface — Popup and Dashboard share one header carrying the language and appearance settings. Note the split this creates: the code stays English-only, while every user-facing string lives in a translation catalog — see the `coding-conventions` skill.

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
- **`subagent-delegation`** — delegate proactively where work splits into parallel streams or needs a cold context, but never for what is faster inline; name the model on every call — `opus` for judgement calls and anything touching accessibility, permissions or the i18n catalogs, `sonnet` for everything else, and nothing cheaper; treat every result as a claim to verify, not a finished one

Do not duplicate these rules here — consult the skills, they stay up to date independently of this file.

## Quick reference

- Install dependencies: `pnpm install`
- Start local dev: `pnpm dev` (auto-launches a browser with the extension loaded, hot reload)
- Build per browser: `pnpm build` (Chrome, the default), `pnpm build:firefox`, `pnpm build:edge`
- See `docs/concept.md` §9 and the README for detailed local-testing/debugging steps

## Driving the extension in a real browser

### Who does the testing — Angelika, by default

**Do not open the browser after a code change just to confirm the change works.**
Angelika tests the extension herself. Finish the work, run what does not need a
browser — `pnpm lint`, `pnpm typecheck`, `pnpm test`, and a build where that is in
doubt — and hand it over saying plainly which parts nothing has verified yet.

Two things put the browser back in Claude's hands:

- **She reports that something looks or behaves wrong.** Then go and look at it
  rather than reasoning about it from the source — she has already established
  that the code and the result disagree, which is exactly the case reading the
  code cannot settle.
- **She asks for a full pass**, usually after a large change.

If a change genuinely cannot be judged without a browser, say so and ask. Do not
open one on your own initiative, and do not leave the doubt unmentioned either.

This is not a claim that browser checks are wasteful — the ones this file
describes below have caught real defects. It is that she is faster at noticing
what is wrong with her own product, and a run that only re-confirms what the unit
tests already cover spends the session watching a browser start up.

### How, once it is called for

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

### Test it the way a user would use it

Drive the extension through the interface: click the buttons, tick the boxes, type into
the fields, read the result back off the page. A test run that reaches past the UI proves
that the storage layer works, which the unit tests already cover — what it cannot show is
whether the thing is usable, and that is the entire point of taking the browser out.

`evaluate_script` is the exception, not a shortcut. It is on the `ask` list in
`.claude/settings.json` on purpose. Reach for it only when there is genuinely no way to
observe or do the thing through the UI — reading `document.documentElement.lang` for WCAG
3.1.1 is such a case, the accessibility tree does not carry it, and so is the toolbar
badge, which appears on no page at all. When it is unavoidable, ask first and say what is
being read and why nothing else would do. Never use it to set up state that clicking could
have produced.

Four constraints are worth knowing before writing a test plan:

- **Chrome's `--load-extension` flag no longer works** (disabled since Chrome 137, and the
  `DisableLoadExtensionCommandLineSwitch` escape hatch is gone as of Chrome 151). Loading
  over CDP via `install_extension` is the only remaining route, which is why
  `--categoryExtensions=true` is set in `.mcp.json`. This is about the browser driven from
  here and says nothing about `pnpm dev`, which does still come up with the current build
  loaded — do not "fix" the README on the strength of this bullet.
- **The popup bubble is reachable, but only while it stays open.** `trigger_extension_action`
  opens it, and a moment later it appears in `list_pages` as a regular extension page. Select
  it with `select_page` and `bringToFront: false` — bringing anything else to the front
  dismisses the bubble, and so does navigating the tab underneath it. Because the tab below
  stays the active one, the popup sees it as the current page and the save button is enabled,
  so the full save flow is testable this way. Opening `popup.html` as a tab of its own is a
  different situation: it is then its own active tab, has no meaningful "current page", and
  the save button is correctly disabled. Good enough for layout and translations, useless for
  saving.
- **The browser is restricted to a URL allowlist** (`--allowedUrlPattern`), and the
  extension's own pages have to be part of it or navigating to them fails outright. Chrome
  derives the ID of an unpacked extension from its folder path, so the entry currently in
  `.mcp.json` stays valid — but moving `.output/chrome-mv3` changes the ID and silently
  breaks every test. Read the ID back from `list_extensions` when that happens.
- **`fill` does not reach React state on a `<textarea>`.** The value lands in the DOM, the
  component never hears about it, and the field saves empty without any error. Click the
  field and use `type_text` for anything multi-line. `fill` is fine for `<input>` and
  `<select>`.

`take_snapshot` returns the accessibility tree, which makes it the better tool than
`take_screenshot` for checking landmarks, live regions and label association. Two things it
does not show: the `lang` attribute, and any text a live region is still holding back — the
dashboard's result count is announced on a deliberate delay, so a snapshot taken right after
a keystroke shows the previous count rather than a bug.
