import type { ReactNode, Ref } from 'react';

/**
 * A button that shows an icon and says its name in text anyway.
 *
 * The name is the point of this component. An icon alone has no accessible
 * name, and "edit" is not a shape anybody is born knowing, so the label is both
 * the button's name for assistive technology and its tooltip for whoever is
 * guessing at the picture (WCAG 2.2 AA, 1.1.1 and 4.1.2). The `title` reaches
 * the accessibility tree as the description, so it repeats the label word for
 * word: a shorter tooltip would have a screen reader say a second, different
 * thing.
 *
 * The box is 36×36 CSS px, comfortably past the 24×24 minimum for pointer
 * targets (2.5.8). A caller short of room can shrink it by setting
 * `--control-size` on any ancestor — the popup's header does, at 32px. A custom
 * property rather than a prop because this button sits four components deep
 * behind `PopoverButton` and `SettingMenu`, and threading a size through would
 * give three of them a prop that means nothing to them. **Keep any such value
 * at 24px or above**, with headroom rather than on the minimum: below it the
 * target fails 2.5.8 unless it earns the spacing exception, a calculation
 * nobody will redo when the layout next moves.
 *
 * A button with something open is drawn filled, in the tone the tags use. That
 * is the sighted counterpart to `aria-expanded` and not the only one — what the
 * button opened sits right underneath it, so the state is never carried by fill
 * alone (1.4.1). Not `surface-tint`, which in the light palette is exactly the
 * hover tone: an open button would be indistinguishable from a hovered one.
 *
 * Every icon is drawn in `glyph`, the delete one included: that is the design's
 * tone for a drawn shape, and a red delete glyph among violet ones would say
 * "destructive" in color alone (1.4.1), which the shape and the name already
 * say in full. The confirmation that follows is the red one, where the colour
 * only underlines words.
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
      className={`inline-flex h-[var(--control-size,2.25rem)] w-[var(--control-size,2.25rem)] shrink-0 items-center justify-center rounded-control border border-line-strong text-glyph hover:bg-surface-hover ${
        expanded === true ? 'bg-pill' : ''
      }`}
    >
      {children}
    </button>
  );
}
