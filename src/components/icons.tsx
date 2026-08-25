/**
 * The handful of icons the interface uses, drawn inline.
 *
 * Inline rather than from an icon library: two shapes are not worth a
 * dependency, and a bundled library would be one more thing to keep updated
 * for the sake of code that never changes (docs/concept.md §7.4).
 *
 * They are decoration, never information — every one of them sits inside a
 * control that carries its own name in text (see `IconButton`), so they are
 * hidden from assistive technology. `currentColor` lets the control decide
 * the color, which keeps the contrast question in one place.
 */

/** Pencil, for opening the form on a saved link. */
export function EditIcon() {
  return (
    <Icon>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </Icon>
  );
}

/** Waste basket, for removing a saved link. */
export function DeleteIcon() {
  return (
    <Icon>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l.9 12a1 1 0 0 0 1 .9h6.2a1 1 0 0 0 1-.9L17 7" />
      <path d="M10 11v5M14 11v5" />
    </Icon>
  );
}

/**
 * The frame both share: a square that scales with the text around it, drawn
 * in strokes so it stays legible at small sizes and in either theme.
 */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Globe, for the interface language. */
export function LanguageIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </Icon>
  );
}

/**
 * Crescent moon, for light and dark.
 *
 * The same shape whichever scheme is active: it names the setting, it does not
 * report its value. A glyph that flipped between a sun and a moon would be
 * telling the user something in a picture alone (WCAG 2.2 AA, 1.4.1), and the
 * menu behind it already says which of the three is chosen, in words.
 */
export function ThemeIcon() {
  return (
    <Icon>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Icon>
  );
}

/** Cog, for what the extension keeps in this browser and how to move it. */
export function DataIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Icon>
  );
}

/** Cross, for dismissing the data dialog. */
export function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

/** Chevron pointing down, for the drop-down fields. */
export function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
