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
