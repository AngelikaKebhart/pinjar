import { useEffect, useId, useState, useRef, type ReactNode, type RefObject } from 'react';
import { IconButton } from '@/src/components/IconButton';

/**
 * How a panel heads itself. The panels differ in the element they need — a
 * `legend` for a set of choices in a fieldset, a heading for a list of places
 * to go — so this cannot move into the component: a `legend` has to be the
 * first child of its own fieldset and can never be passed in from outside.
 * What they share is only the look, and that is what lives here.
 */
export const POPOVER_HEADING = 'mb-2 font-serif text-base font-semibold';

/**
 * One row inside a panel — a menu entry or a setting's option.
 *
 * The rows carry no gap between them on purpose: each has its own hover
 * background, and separating them cuts that into stripes rather than the one
 * continuous surface a menu is read as. The padding here is what sets the
 * rhythm, and it is the only place to change it — every panel in the extension
 * hangs off the same header and they are read as one kind of thing.
 *
 * Callers add what is theirs alone: the layout an option needs for its radio,
 * the full width a button does not get for free.
 */
export const POPOVER_ROW = 'rounded-field px-3 py-1.5 text-sm hover:bg-surface-hover';

/**
 * An icon button that reveals a small panel anchored under it.
 *
 * A disclosure, not a dialog: `aria-expanded` says whether the panel is
 * showing, and the page behind stays usable. What is inside is short enough
 * that trapping focus in it would cost more than it gives.
 *
 * Anchored to the right edge of the button and growing leftwards, because both
 * of its users sit at the right edge of something — the header bar and a card's
 * row of actions. Its width is capped at the page width for the same reason: on
 * a 320px screen a fixed 18rem would reach past the left edge and take the
 * dashboard into sideways scrolling (WCAG 2.2 AA, 1.4.10).
 *
 * Four ways out, all handled here so no caller has to: the button, Escape, a
 * press outside, and moving focus away. The first two hand focus back to the
 * button; the other two are the user going somewhere themselves.
 */
export function PopoverButton({
  label,
  icon,
  initialFocusRef,
  children,
}: {
  /** Names the button, and heads the panel if the caller wants it to. */
  label: string;
  icon: ReactNode;
  /**
   * What takes focus when the panel opens — not simply the first focusable
   * element: for a set of choices it is the one already chosen, and for a
   * confirmation it is the answer rather than the question.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** The panel's content. `close` dismisses it and hands focus back. */
  children: (close: () => void) => ReactNode;
}) {
  /*
   * Three states rather than a boolean. "closing" and "closed" both mean the
   * panel is not showing and differ only in whether focus is handed back —
   * Escape and the button do, a press elsewhere does not, because the user is
   * already on their way somewhere.
   *
   * In state rather than a ref, so the closer can be handed to the panel's
   * content: rendering the panel would otherwise be reading a ref.
   */
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const isOpen = state === 'open';

  useEffect(() => {
    if (state === 'open') {
      initialFocusRef?.current?.focus();
    } else if (state === 'closing') {
      buttonRef.current?.focus();
    }
  }, [state, initialFocusRef]);

  /*
   * The two ways out that do not go through a control of this component, both
   * listened for on the document: Escape has to work wherever the focus
   * happens to be, and the press is taken on the way down so a control outside
   * does not have to fight the panel for the same gesture.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setState('closing');
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setState('closed');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        /*
         * Tabbing past the last control leaves the panel behind; without this
         * it would stay open over content the user has moved on from.
         *
         * Only when focus lands on something, though. Pressing the mouse on a
         * label inside the panel blurs with nothing to hand focus to yet — the
         * label passes the click on to its radio a moment later — and closing
         * on that took the label out of the document before the click arrived,
         * leaving a panel where only the dot could be hit, never the word.
         */
        const goingTo = event.relatedTarget;

        if (goingTo !== null && !event.currentTarget.contains(goingTo)) {
          setState('closed');
        }
      }}
    >
      <IconButton
        ref={buttonRef}
        label={label}
        expanded={isOpen}
        controls={panelId}
        onClick={() => setState(isOpen ? 'closing' : 'open')}
      >
        {icon}
      </IconButton>

      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 z-10 mt-2 w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-4 shadow-card"
        >
          {children(() => setState('closing'))}
        </div>
      )}
    </div>
  );
}
