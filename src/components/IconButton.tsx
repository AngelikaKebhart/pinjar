import type { ReactNode, Ref } from 'react';

/**
 * A button that shows an icon and says its name in text anyway.
 *
 * The name is the whole point of this component existing. An icon on its own
 * has no accessible name at all, and "edit" is not a shape anybody is born
 * knowing — so the label is both the button's name for assistive technology
 * and its tooltip for whoever is looking at the picture and guessing (WCAG
 * 2.2 AA, 1.1.1 and 4.1.2). The `title` reaches the accessibility tree as the
 * button's description, so it carries the same sentence word for word: a
 * screen reader that reads descriptions out then has nothing new to add,
 * where a shorter tooltip would have it say a second, different thing.
 *
 * The box is 36×36 CSS px, comfortably past the 24×24 minimum for pointer
 * targets (2.5.8): the icon inside is smaller than the area that answers to
 * a click.
 *
 * A button that has something open right now is drawn filled, in the same tone
 * the tags are set in. That is the sighted counterpart to `aria-expanded`, and
 * it is deliberately not the only one: whatever the button opened is sitting
 * right underneath it, so the state is never carried by the fill alone (1.4.1).
 * Not `surface-tint`, which in the light palette is the hover tone to the
 * letter — an open button would then be indistinguishable from one the pointer
 * happens to be resting on.
 *
 * Every one of them is drawn in `glyph` — Crimson Violet, the deepest of the
 * three reds — including the one that deletes. That is the design's tone for a
 * drawn shape, and it is one tone for all of them on purpose: a red delete
 * glyph among violet ones would be saying "destructive" in color alone
 * (1.4.1), which the shape and the name already say in full. The confirmation
 * that follows is the red one, where the question is in words and the color
 * only underlines them.
 */
export function IconButton({
  label,
  onClick,
  children,
  ref,
  expanded,
  controls,
  hasPopup,
}: {
  /** Names the button, and names what it acts on: "Delete “Blue jersey”". */
  label: string;
  onClick: () => void;
  /** The icon. */
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  /** Set on a button that reveals something, to say whether it is showing. */
  expanded?: boolean;
  /** The id of what `expanded` refers to. */
  controls?: string;
  /** What opens when the button is pressed, where that is not obvious. */
  hasPopup?: 'dialog';
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup={hasPopup}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line-strong text-glyph hover:bg-surface-hover ${
        expanded === true ? 'bg-pill' : ''
      }`}
    >
      {children}
    </button>
  );
}
