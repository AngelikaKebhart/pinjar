---
name: accessibility-wcag
description: Ensures all UI in this project (Popup and Dashboard, React components) meets WCAG 2.2 Level AA — color contrast, full keyboard operability, minimum target sizes, semantic HTML and ARIA, image alt text, and correct page-language declaration for the bilingual German/English interface. Apply this skill whenever creating or modifying ANY UI component, layout, form, button, list, filter control, translated string, or other visual/interactive element in this project, even if accessibility is not explicitly mentioned in the request. This is a mandatory, non-negotiable project requirement, not an optional nice-to-have.
---

# Accessibility (WCAG 2.2 Level AA)

This project must conform to WCAG 2.2 AA. Apply the following whenever touching Popup or Dashboard UI code (React components).

## Perceivable

- **Contrast**: text must have a contrast ratio of at least 4.5:1 against its background (3:1 for large text ≥ 18pt/24px or bold ≥ 14pt/19px, and for UI component boundaries/icons). Check this whenever choosing or changing Tailwind color classes — don't rely on a color palette "looking fine".
- **Don't rely on color alone**: status (e.g., "Gemerkt"/"Gekauft"/custom statuses) must be conveyed with text or an icon in addition to color, not color alone. Same applies to any success/error states.
- **Images**: every preview image needs a meaningful `alt` attribute — use the page title as the alt text fallback when no better description exists. Purely decorative icons get `alt=""` or `aria-hidden="true"`.
- **Text must not be clipped in either language**: German strings run roughly 20–35% longer than their English equivalents ("Save" → "Speichern"). Avoid fixed widths and `overflow: hidden` on labels, buttons and column headers; let them wrap. This matters most in the narrow Popup. Check a new component in both languages before calling it done — truncated text is unreadable content, not a layout nitpick.
- **Reflow at 320 CSS px (WCAG 1.4.10) and zoom to 200% (1.4.4)**: the Dashboard must stay usable, without horizontal scrolling, at 320 CSS px of width. This is not about phones — extensions barely run on them — it is what 400% browser zoom leaves of an ordinary screen, and it is a Level AA criterion in its own right.
  - Check every new layout at that width, not just that it avoids a horizontal scrollbar. Text squeezed into a 30px column technically reflows and is still unreadable.
  - The usual culprits are a fixed-size element next to flexible text (a preview image beside a title) and a two-column grid whose label column is sized by its content — the longer German labels make both worse. Give them a `sm:` breakpoint so they stack while narrow, rather than shrinking the text to nothing.
  - **No automated test covers this.** jsdom has no layout engine, and asserting on Tailwind class names would test the implementation rather than the result. Verify it by hand in the browser — DevTools device toolbar at 320px, or Ctrl/Cmd+`+` to 400% — and say in the change description that you did.

## Operable

- **Full keyboard access**: every interactive element (save button, tag input, filter dropdowns, delete buttons, status changer) must be reachable and operable via Tab/Shift+Tab/Enter/Space, without a mouse. Test the tab order logically follows the visual layout.
- **Visible focus indicator**: never remove the default focus outline (`outline: none`) without providing an equally visible custom focus style.
- **Target size**: interactive elements (buttons, tag chips with delete icons, checkboxes) should have a hit area of at least 24×24 CSS px, per WCAG 2.2's minimum target size criterion.
- **No time limits**: don't impose auto-dismiss timers on confirmations or forms that a user might need more time to complete (e.g., don't auto-close a "link saved" toast so fast it's unreadable — allow it to be dismissed manually or give it a generous duration).

## Understandable

- **Labels**: every form field (category select, tag input, notes textarea, status field) needs a proper associated `<label>` — not just a placeholder, since placeholders disappear on input and aren't a reliable substitute for a label.
- **Error messages**: validation/error messages (e.g., invalid import file) must clearly state what went wrong and, where possible, how to fix it — not just "Error".
- **Language of page (WCAG 3.1.1)**: the `<html lang>` attribute must state the currently active UI language (`de` or `en`) and must be updated when the user switches language. This is what screen readers use to pick pronunciation — German text announced by an English speech engine is unintelligible. Setting `lang` once at build time is not enough, because the language is switchable at runtime.
- **Language switcher**: it is a real, labelled form control, and each option is named in its own language ("Deutsch", "English") so it stays usable when the UI is currently in the language the user does not read.
- **Translated text must stay accessible**: everything the accessibility rules require — `alt` text, `aria-label`, error messages, button names — has to be translated as well. An `aria-label` left in English inside an otherwise German UI is an accessibility defect, not a cosmetic one.

## Robust

- **Semantic HTML first**: use `<button>` for actions, `<a>` for navigation/links, `<ul>/<li>` for lists, real form elements — not `<div onClick>`. Reach for ARIA only when native HTML semantics genuinely aren't enough.
- **ARIA for dynamic content**: when the Dashboard's filtered/searched list updates, consider an `aria-live="polite"` region (or similar) so screen reader users are informed the result set changed, without being overwhelming on every keystroke (debounce before announcing).
- **Landmarks**: use appropriate landmark roles/elements (`<nav>`, `<main>`, headings in order `h1` → `h2` → ...) in the Dashboard so it's navigable via screen reader shortcuts.

## When building a new component

Before considering a component done, mentally (or literally) tab through it, check it renders sensibly with a screen reader's accessibility tree in mind, verify text/background contrast for any custom colors introduced, and view it in **both** German and English to confirm nothing is clipped or overflows.
