---
name: privacy-and-security
description: Encodes this project's privacy (GDPR/DSGVO) and security requirements — data minimization, no transfer of data to third parties, minimal browser permissions, no dynamically loaded or remote code, safe handling of untrusted data extracted from visited webpages (XSS prevention), dependency hygiene, and full user control over their stored data (including delete-all). Apply this skill whenever writing or reviewing code that touches user data, browser storage, extension permissions (manifest.json / wxt.config.ts), extraction of page metadata from the visited tab, the export/import feature, or adds/updates a dependency — even if privacy or security aren't explicitly mentioned in the request.
---

# Privacy (GDPR/DSGVO) and Security

This extension stores data **only locally** in the browser (no server, no account, no automatic sync). That significantly reduces — but does not eliminate — privacy and security risk. Both areas are covered together here because they largely concern the same trust boundary: data coming from the outside web, and data leaving the user's control.

## Privacy (GDPR / DSGVO) — "Privacy by Design"

Even without server-side storage today, build with these principles so a future public release doesn't require rework:

- **Data minimization**: only store what's needed for the feature (URL, domain, title, image URL, category, tags, status, note, timestamps) plus explicit user settings such as the chosen UI language. Do not add analytics, telemetry, or tracking fields "just in case". Store the language preference as the bare choice (`"de"`, `"en"`, `"auto"`) — do not record the detected browser locale, timezone, or anything else alongside it; that would be fingerprinting-adjacent data with no functional purpose.
- **No third-party data transfer**: no data leaves the user's browser. Do not introduce any network call that sends stored data (or browsing data) to an external server. If a future feature (e.g., cloud sync) is proposed, it must be explicit opt-in and clearly communicated — never silently enabled.
- **Transparency**: keep a clear, plain-language privacy note ready for store listings, describing exactly what is stored and that it stays local.
- **Minimal permissions**: request only the browser permissions actually needed (see Security section below) — broad data-access permissions are also a privacy problem, not just a security one.
- **User control over their data**:
  - Users must be able to delete an individual saved item at any time.
  - Provide a "delete all data" action in the Dashboard, not just per-item deletion.
- **No cookies / no fingerprinting**: don't add tracking mechanisms of any kind.
- **Export files**: when implementing export, note in the UI (or docs) that the exported file is unencrypted and may contain personal notes — the user is responsible for handling it carefully once exported.

## Security

- **Treat extracted webpage data as untrusted**: the title and the `og:image` URL come from arbitrary (potentially malicious) websites.
  - Never use `dangerouslySetInnerHTML` in React for this data — render it through normal JSX so React's automatic escaping applies. This is a hard rule, not a style preference.
  - Validate image URLs before use (only accept `http:`/`https:` schemes).
- **Minimal permissions principle**: prefer `activeTab` over broad host permissions like `<all_urls>`. Only add a permission when a concrete feature requires it, and note in the PR/commit why it's needed. The extension currently declares exactly `storage`, `activeTab` and `scripting` — **no host permission at all**, which is why it installs without an access warning. Treat adding one as a decision that needs explicit sign-off, not a convenience.
- **No declarative content script**: page metadata is read by a function injected into the active tab via `scripting.executeScript()` on user action, not by a content script registered in the manifest — the latter would need `<all_urls>` and would run on every page the user ever visits. This is a deliberate architectural decision, documented in `docs/concept.md` §6.4. If a future feature genuinely needs to act without a user gesture (e.g. an in-page indicator), request an *optional* host permission via `permissions.request()` so the user opts in — never widen the base manifest.
- **No dynamically loaded or remote code**: the entire extension must ship as part of the built bundle. Never fetch and `eval`/inject remote JavaScript at runtime — this is both a security risk and disallowed by Manifest V3's CSP and store policies.
- **Translations ship with the bundle**: the German and English message catalogs are static files built into the extension. Never load them from a remote source and never call an online translation service at runtime — that would be both a transfer of user data to a third party and a violation of the no-remote-code rule. Translating new strings is a build-time authoring task, not a runtime feature.
- **Safe domain/URL parsing**: use the native `URL` API (e.g., `new URL(pageUrl).hostname`) for domain extraction used by the badge indicator — do not hand-roll this with regex, which is error-prone and can be bypassed.
- **Page extraction stays read-only**: the injected script may read the DOM/meta tags of the visited page but must never execute or evaluate code found on that page.
- **Dependency hygiene**: keep dependencies few and well-maintained. Commit the lockfile. Run `pnpm audit` regularly, and review dependency updates rather than blindly auto-merging them.
- **Audit exceptions are documented and temporary**: when an advisory genuinely cannot be fixed (no patched version exists, or the fix sits behind an upstream pin), suppress that specific advisory in `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` — never disable the audit as a whole, and never suppress by severity. Every entry needs a written reason and the condition under which it must be removed again. Re-check the list whenever dependencies are updated.

## When reviewing a PR or writing new code

Ask: does this change introduce a new permission, a new network call, a new place where webpage-sourced data gets rendered, or a new dependency? If yes, double-check it against the rules above before proceeding.
