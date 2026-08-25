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
 * A disc half filled in, for light and dark.
 *
 * The same shape whichever scheme is active: it names the setting, it does not
 * report its value. A glyph that flipped between a sun and a moon would be
 * telling the user something in a picture alone (WCAG 2.2 AA, 1.4.1), and the
 * menu behind it already says which of the three is chosen, in words.
 */
export function ThemeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Stacked discs, for everything stored in this browser. */
export function DataIcon() {
  return (
    <Icon>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
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
