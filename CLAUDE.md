# CLAUDE.md

This file provides project-level guidance to Claude Code when working in this repository.

## Project

A cross-browser extension (Chrome, Firefox, Edge) that acts as a universal, shop-independent wishlist/bookmark manager. Users save links from any website with one click; the extension shows a badge indicator on domains where something was already saved, and lets users organize saved items with categories, tags, notes, and a customizable status.

The user interface is offered in **German and English**. It starts in the browser's language and can be switched manually in the Dashboard. Note the split this creates: the code stays English-only, while every user-facing string lives in a translation catalog — see the `coding-conventions` skill.

Full product concept, feature list, data model, and rationale live in `docs/concept.md`
(written in German). It is deliberately **not** imported into this file: it is 30 KB of
reference material that would sit in the context of every session, while any given task
needs a section of it at most. Read the section a task actually touches:

| Section | Covers |
| --- | --- |
| §3 | Core features — saving, the domain badge, categories/tags/status, popup, dashboard, export/import, bilingual UI |
| §4 | Data model, and why status is a tagged union rather than a plain string |
| §5 | Design and UX, including what bilingual text does to layouts |
| §6.2–6.4 | Project structure, i18n mechanics, and why there is no content script |
| §7.2 | WCAG 2.2 AA requirements |
| §7.3–7.4 | GDPR and security rules, including the permission set and its rationale |
| §9 | Local testing and debugging steps |
| §11 | Deliberately deferred ideas — check here before "adding" one |

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
- **`subagent-delegation`** — delegate only when asked and never to `opus`, since a subagent buys wall-clock time rather than budget; verify every result before using or reporting it

Do not duplicate these rules here — consult the skills, they stay up to date independently of this file.

## Working economically

Usage limits are a real constraint on this project. The rules below exist so the budget is
spent on thinking rather than on re-reading, re-running and re-explaining. None of them is
licence to do the work less carefully — where one of them would cost correctness, ignore it
there and say why.

- **Read what you need.** Grep, or read the relevant range, rather than pulling in whole
  files above a few hundred lines. Never re-read a file just written to confirm the write
  landed — a failed edit reports itself.
- **Edit rather than rewrite.** An edit emits the changed hunk; rewriting a file emits the
  whole file as output. Rewrite only when most of the file genuinely changes.
- **Verify once, at the end.** Run `pnpm check` — lint, typecheck and tests in one command —
  when the change is complete, not after every step. While chasing a single failure re-run
  that one test file, and the full gate once it passes.
- **Do what was asked.** No neighbouring refactors, no extra tests, no summary documents
  nobody requested. Raise the idea in a sentence and let Angelika decide.
- **Hand over briefly.** A few lines on what changed, what was verified, and what nothing has
  verified yet. Not a report.
- **Batch independent tool calls** into one message instead of one per turn.
- **Say when a fresh session would be cheaper.** Every message re-sends the whole
  conversation, so an unrelated question at the end of a long session pays for all of it.
  When the topic changes, mention that `/clear` costs nothing.

### Effort levels

The session default is `medium` (`effortLevel` in `~/.claude/settings.json`). The two skills
whose mistakes are expensive and quiet — `accessibility-wcag` and `privacy-and-security` —
raise themselves to `high` through their `effort` frontmatter, so the hard domains stay
covered without anyone having to remember.

For other work that genuinely warrants deeper reasoning — an architecture decision, a subtle
bug, a cross-cutting refactor — say so rather than quietly making do. Angelika can raise the
level with `/effort high`, or add `ultrathink` to a single prompt, which asks for deeper
reasoning on that turn alone without changing the session setting.

## Quick reference

- Install dependencies: `pnpm install`
- Start local dev: `pnpm dev` (auto-launches a browser with the extension loaded, hot reload)
- Build per browser: `pnpm build -b chrome` / `pnpm build -b firefox` / `pnpm build -b edge` (or `pnpm wxt build -b <browser>`, depending on how scripts are set up)
- See `docs/concept.md` §9 for detailed local-testing/debugging steps, and the README once it exists

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
MCP server configured in `.mcp.json`. **It is switched off by default** via
`disabledMcpjsonServers` in `.claude/settings.json`, because its tool definitions occupy
context in every session and, per the rule above, most sessions never drive a browser.

To turn it back on for a full pass, remove `"chrome-devtools"` from that list and restart the
session; the server also has to be approved once per machine (`/mcp`, or the prompt shown at
session start). Ask for that when a browser is genuinely needed — do not work around the
absence of the tools by guessing at what the UI does.

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
  `--categoryExtensions=true` is set in `.mcp.json`.
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
