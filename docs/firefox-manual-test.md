# Firefox: what has to be checked by hand

Firefox is the only target built as **MV2**. Chrome and Edge share one MV3 manifest, byte for
byte, and share an engine — what works in one works in the other. Firefox does not, and the
differences are not the kind a unit test can see: they live in browser APIs that only exist at
runtime, in a different manifest, and in a rendering engine of its own.

This list is deliberately short. It covers **only** what MV2 or Gecko can break. Filters, search,
editing, the data model, the translation catalogs — all of that is engine-independent React and
storage logic, covered by `pnpm test` and by the Chrome run. Repeating it here would cost time and
prove nothing.

Work through it before a release, and after any change to the background worker, the badge, the
manifest, or the export/import.

## Setting up

```sh
pnpm build:firefox
```

Then in Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick
`.output/firefox-mv2/manifest.json`.

Use the **production build**, not `pnpm dev:firefox`. WXT adds permissions of its own to a dev
build — `tabs` among them — so a badge that only works because of the dev manifest looks perfectly
healthy there and falls silent in the store build. Dev mode is for iterating on code, not for
answering the questions below.

Keep the browser console open while testing (`Ctrl+Shift+J`, the one for the *browser*, not the
page). Anything the add-on throws lands there.

---

## 1. It installs, and Firefox accepts the manifest

**Do:** load the temporary add-on as described above.

**Expect:** it appears in the list with no warning, and `about:addons` → PinJar →
Permissions and data shows exactly this:

- under required permissions, **"Access browser tabs"** and nothing else. `storage`, `activeTab`
  and `scripting` are in the manifest but are not warning-worthy to Firefox, so they are not
  listed — their absence here is correct, not a missing permission.
- **nothing about website content.** A line about access to data for all websites would mean a
  host permission crept into the manifest, which is the one thing §6.4 of the concept rules out.
- under data collection, **"no data collection"** — this is the `data_collection_permissions`
  declaration, required by Firefox since November 2025 and visible nowhere else.

The description on that page is also worth a glance: in a German Firefox it has to be the German
one, which is the only proof that `_locales` resolved.

**If it fails:** a manifest key MV2 does not know, or the version floor is wrong. The generated
manifest is `.output/firefox-mv2/manifest.json`; compare it against `wxt.config.ts`.

## 2. Saving actually reads the page

This is the one most likely to be broken and the most expensive to miss. Title and preview image
come from a function injected with `scripting.executeScript` — an API that arrived in Firefox
later than in Chrome and behaves differently under MV2. When injection fails, saving still works,
which is exactly what makes the failure quiet: the entry is simply poorer than it should be.

**Do:** open a page whose `<title>` differs from its `og:title`, or at least one that carries an
`og:image` — `https://justament-consulting.at/accessibility` does. Click the toolbar icon, then
**Save this page**. Open the dashboard.

**Expect:** the entry carries a **preview image**, and its title is the page's own, not a
truncated tab label.

**If it fails:** no image and a tab-shaped title mean `readPageMetadata` fell into its `catch`.
Look in the *page's* console — the injected script reports there, not in the add-on's console.

## 3. Saving a page Firefox will not let us read

**Do:** open `about:preferences`, then the toolbar icon.

**Expect:** the save button is disabled, and the popup says that only http and https pages work.
No error in the console.

**If it fails:** the domain check in `extractDomain` is letting through something it should not.

## 4. The badge

The toolbar button is `browserAction` in MV2, not `action`. `src/lib/badge.ts` picks whichever
exists; Firefox is the only browser that ever takes the second branch, so nothing else tests it.

**Do:** with at least one link saved for a domain, open a **new tab** on that same domain.

**Expect:**

- a number on the toolbar icon, white on blue
- hovering the icon shows a tooltip that names the count in words
- a domain with nothing saved shows **no** badge — not a zero
- more than 99 saved on one domain shows `99+`

**If it fails:** most likely `setBadgeTextColor`, which not every version supports and which is
called optionally for that reason. A badge with unreadable colors is a contrast failure, not a
cosmetic one.

## 5. The badge after the background page has gone idle

New since `persistent: false`: the background page is allowed to unload between events. It has to
come back on its own.

**Do:** load the add-on, then leave Firefox alone for a few minutes without touching the
extension. Then open a new tab on a domain that has saved links.

**Expect:** the badge appears as in check 4.

**If it fails:** something in the worker is holding state across events instead of reading it from
storage each time. `about:debugging` → Inspect on the add-on shows whether the page is running.

## 6. Export writes a real file

The download is a blob and a synthetic link click. Firefox ignores a click on a link that is not
in the document, and cancels a download whose blob URL is revoked in the same turn — both are
handled in `downloadJson`, and Firefox is the only browser that would notice if that regressed.

**Do:** dashboard → **Export as a file**.

**Expect:** Firefox offers or saves `pinjar-YYYY-MM-DD.json`. Open it: valid JSON,
every saved link present, umlauts intact (`Prüfschritte`, not `PrÃ¼fschritte`).

**If it fails:** an empty or missing download means the revoke ran too early, or the link never
made it into the document.

## 7. Import reads one back

The picker is a hidden `<input type="file">` opened by a script. Firefox is stricter than Chrome
about which gestures may open one.

**Do:** dashboard → **Import a file** → pick the file from check 6.

**Expect:** the file dialog opens, and afterwards the message names how many links were added and
how many were already on the list. Picking the **same file a second time** must produce a second
message, not silence.

**If it fails:** a dialog that never opens means the click was not treated as a user gesture.

## 8. The popup at its own size

**Do:** open the popup on a domain with two or three saved links, switch the interface to German
(dashboard → Settings), then open the popup again and press **Edit** on one link.

**Expect:** the popup is about 384px wide, nothing is cut off, and the form — which is taller than
the popup — scrolls inside it. The German labels wrap rather than clip.

**If it fails:** Firefox caps popup dimensions differently than Chrome; the fix belongs in the
popup's own layout, not in a fixed height.

## 9. Dark mode, and the language of the document

**Do:** set Firefox to a dark theme (`about:preferences` → Colors, or the OS setting) and open the
dashboard. Then switch the interface language between Deutsch and English.

**Expect:** the dark palette applies to the whole dashboard, including the `<select>` drop-downs
and the scrollbar. In the Inspector, `<html lang>` reads `de` or `en` and **changes with the
switch** — a screen reader picks its pronunciation from it (WCAG 2.2 AA, 3.1.1).

**If it fails:** `color-scheme: light dark` is not reaching the page, or the language effect is
not writing the attribute.

**Not a failure:** on automatic, a dark dashboard next to a light popup. Firefox tells an
extension page in a tab what the browser theme is, and the popup what the operating system is — so
the two disagree whenever those two settings do. Setting Appearance to Hell or Dunkel is what
overrules both, and is worth checking here for exactly that reason.

---

## What this list does not cover

- **Firefox older than 128.** The manifest refuses to install there, on purpose: Tailwind 4 emits
  CSS those versions cannot read. If that floor is ever lowered, the styling has to be re-checked
  from scratch.
- **Firefox for Android.** Never tried. The popup layout assumes a desktop toolbar.
- **Signing and the AMO review.** A temporary add-on skips both. Whatever AMO says about
  permissions or data collection will be said for the first time at submission.
