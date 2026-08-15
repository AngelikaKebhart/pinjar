---
name: accessibility-wcag
description: Ensures all UI in this project (Popup and Dashboard, React components) meets WCAG 2.2 Level AA — color contrast, full keyboard operability, minimum target sizes, semantic HTML and ARIA, and image alt text. Apply this skill whenever creating or modifying ANY UI component, layout, form, button, list, filter control, or other visual/interactive element in this project, even if accessibility is not explicitly mentioned in the request. This is a mandatory, non-negotiable project requirement, not an optional nice-to-have.
---

# Accessibility (WCAG 2.2 Level AA)

This project must conform to WCAG 2.2 AA. Apply the following whenever touching Popup or Dashboard UI code (React components).

## Perceivable

- **Contrast**: text must have a contrast ratio of at least 4.5:1 against its background (3:1 for large text ≥ 18pt/24px or bold ≥ 14pt/19px, and for UI component boundaries/icons). Check this whenever choosing or changing Tailwind color classes — don't rely on a color palette "looking fine".
- **Don't rely on color alone**: status (e.g., "Gemerkt"/"Gekauft"/custom statuses) must be conveyed with text or an icon in addition to color, not color alone. Same applies to any success/error states.
- **Images**: every preview image needs a meaningful `alt` attribute — use the page title as the alt text fallback when no better description exists. Purely decorative icons get `alt=""` or `aria-hidden="true"`.

## Operable

- **Full keyboard access**: every interactive element (save button, tag input, filter dropdowns, delete buttons, status changer) must be reachable and operable via Tab/Shift+Tab/Enter/Space, without a mouse. Test the tab order logically follows the visual layout.
- **Visible focus indicator**: never remove the default focus outline (`outline: none`) without providing an equally visible custom focus style.
- **Target size**: interactive elements (buttons, tag chips with delete icons, checkboxes) should have a hit area of at least 24×24 CSS px, per WCAG 2.2's minimum target size criterion.
- **No time limits**: don't impose auto-dismiss timers on confirmations or forms that a user might need more time to complete (e.g., don't auto-close a "link saved" toast so fast it's unreadable — allow it to be dismissed manually or give it a generous duration).

## Understandable

- **Labels**: every form field (category select, tag input, notes textarea, status field) needs a proper associated `<label>` — not just a placeholder, since placeholders disappear on input and aren't a reliable substitute for a label.
- **Error messages**: validation/error messages (e.g., invalid import file) must clearly state what went wrong and, where possible, how to fix it — not just "Error".

## Robust

- **Semantic HTML first**: use `<button>` for actions, `<a>` for navigation/links, `<ul>/<li>` for lists, real form elements — not `<div onClick>`. Reach for ARIA only when native HTML semantics genuinely aren't enough.
- **ARIA for dynamic content**: when the Dashboard's filtered/searched list updates, consider an `aria-live="polite"` region (or similar) so screen reader users are informed the result set changed, without being overwhelming on every keystroke (debounce before announcing).
- **Landmarks**: use appropriate landmark roles/elements (`<nav>`, `<main>`, headings in order `h1` → `h2` → ...) in the Dashboard so it's navigable via screen reader shortcuts.

## When building a new component

Before considering a component done, mentally (or literally) tab through it, check it renders sensibly with a screen reader's accessibility tree in mind, and verify text/background contrast for any custom colors introduced.
