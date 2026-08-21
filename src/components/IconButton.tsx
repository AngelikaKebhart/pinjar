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
 * Every one of them is drawn in `ink`, including the one that deletes. Red
 * would be saying "destructive" in color alone (1.4.1) — the shape and the
 * name already say it — and it is the pairing that fails 3:1 against a hovered
 * surface in the dark palette. The confirmation that follows is red, where the
 * question is in words and the color only underlines them.
 */
export function IconButton({
  label,
  onClick,
  children,
  ref,
}: {
  /** Names the button, and names what it acts on: "Delete “Blue jersey”". */
  label: string;
  onClick: () => void;
  /** The icon. */
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong text-ink hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}
