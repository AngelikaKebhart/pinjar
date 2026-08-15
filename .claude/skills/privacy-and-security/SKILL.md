---
name: privacy-and-security
description: Encodes this project's privacy (GDPR/DSGVO) and security requirements — data minimization, no transfer of data to third parties, minimal browser permissions, no dynamically loaded or remote code, safe handling of untrusted data extracted from visited webpages (XSS prevention), dependency hygiene, and full user control over their stored data (including delete-all). Apply this skill whenever writing or reviewing code that touches user data, browser storage, extension permissions (manifest.json / wxt.config.ts), content-script extraction of page metadata, the export/import feature, or adds/updates a dependency — even if privacy or security aren't explicitly mentioned in the request.
---

# Privacy (GDPR/DSGVO) and Security

This extension stores data **only locally** in the browser (no server, no account, no automatic sync). That significantly reduces — but does not eliminate — privacy and security risk. Both areas are covered together here because they largely concern the same trust boundary: data coming from the outside web, and data leaving the user's control.

## Privacy (GDPR / DSGVO) — "Privacy by Design"

Even without server-side storage today, build with these principles so a future public release doesn't require rework:

- **Data minimization**: only store what's needed for the feature (URL, domain, title, image URL, price, category, tags, status, note, timestamps). Do not add analytics, telemetry, or tracking fields "just in case".
- **No third-party data transfer**: no data leaves the user's browser. Do not introduce any network call that sends stored data (or browsing data) to an external server. If a future feature (e.g., cloud sync) is proposed, it must be explicit opt-in and clearly communicated — never silently enabled.
- **Transparency**: keep a clear, plain-language privacy note ready for store listings, describing exactly what is stored and that it stays local.
- **Minimal permissions**: request only the browser permissions actually needed (see Security section below) — broad data-access permissions are also a privacy problem, not just a security one.
- **User control over their data**:
  - Users must be able to delete an individual saved item at any time.
  - Provide a "delete all data" action in the Dashboard, not just per-item deletion.
- **No cookies / no fingerprinting**: don't add tracking mechanisms of any kind.
- **Export files**: when implementing export, note in the UI (or docs) that the exported file is unencrypted and may contain personal notes — the user is responsible for handling it carefully once exported.

## Security

- **Treat extracted webpage data as untrusted**: title, `og:image` URL, and any auto-detected price come from arbitrary (potentially malicious) websites.
  - Never use `dangerouslySetInnerHTML` in React for this data — render it through normal JSX so React's automatic escaping applies. This is a hard rule, not a style preference.
  - Validate image URLs before use (only accept `http:`/`https:` schemes).
- **Minimal permissions principle**: prefer `activeTab` over broad host permissions like `<all_urls>`. Only add a permission when a concrete feature requires it, and note in the PR/commit why it's needed.
- **No dynamically loaded or remote code**: the entire extension must ship as part of the built bundle. Never fetch and `eval`/inject remote JavaScript at runtime — this is both a security risk and disallowed by Manifest V3's CSP and store policies.
- **Safe domain/URL parsing**: use the native `URL` API (e.g., `new URL(pageUrl).hostname`) for domain extraction used by the badge indicator — do not hand-roll this with regex, which is error-prone and can be bypassed.
- **Content-script extraction stays read-only**: the content script may read the DOM/meta tags of the visited page but must never execute or evaluate code found on that page.
- **Dependency hygiene**: keep dependencies few and well-maintained. Commit the lockfile. Run `npm audit` (or equivalent) regularly, and review dependency updates rather than blindly auto-merging them.

## When reviewing a PR or writing new code

Ask: does this change introduce a new permission, a new network call, a new place where webpage-sourced data gets rendered, or a new dependency? If yes, double-check it against the rules above before proceeding.
