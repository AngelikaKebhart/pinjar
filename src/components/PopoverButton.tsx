import { useEffect, useId, useState, useRef, type ReactNode, type RefObject } from 'react';
import { IconButton } from '@/src/components/IconButton';

/**
 * An icon button that reveals a small panel anchored under it.
 *
 * A disclosure, not a dialog: `aria-expanded` on the button says whether the
 * panel is showing, and the page behind stays usable. What is inside is short
 * enough that trapping focus in it would cost more than it gives.
 *
 * The panel is anchored to the right edge of the button and grows leftwards,
 * because both of its users sit at the right edge of something — the header
 * bar and a card's row of actions. Left-anchored it would run off the page.
 * Its width is capped at the width of the page for the same reason: on a 320px
 * screen a fixed 18rem would reach past the left edge and take the whole
 * dashboard into sideways scrolling (WCAG 2.2 AA, 1.4.10).
 *
 * Four ways out, all of them handled here so no caller has to think about it:
 * the button itself, Escape, a press outside, and moving focus away. The first
 * two hand focus back to the button, since that is where the user was standing;
 * the other two are the user going somewhere themselves.
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
   * What takes focus when the panel opens.
   *
   * Not simply the first focusable element: for a set of choices it is the one
   * already chosen, which is rarely the first, and for a confirmation it is the
   * answer rather than the question.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** The panel's content. `close` dismisses it and hands focus back. */
  children: (close: () => void) => ReactNode;
}) {
  /*
   * Three states rather than a boolean. "closing" and "closed" both mean the
   * panel is not showing; they differ only in whether the user was sent away
   * from it — Escape and the button hand focus back, a press elsewhere does
   * not, because the user is already on their way somewhere.
   *
   * Keeping that in state rather than in a ref is what lets the closer be
   * handed to the panel's content: a function that reads a ref cannot be,
   * since rendering the panel would then be reading a ref.
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
   * The two ways out that do not go through a control of this component:
   * Escape, and a press somewhere else on the page.
   *
   * Both are listened for on the document rather than on the panel. Escape has
   * to work wherever the focus happens to be, and the press is taken on the way
   * down so that a control outside does not have to fight the panel for the
   * same gesture.
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
         * it would stay open over content the user has already moved on from.
         *
         * Only when focus lands on something, though. Pressing the mouse on a
         * word inside the panel blurs the control that had focus with nothing
         * to hand it to yet — the label passes the click on to its radio a
         * moment later — and closing on that took the label out of the document
         * before the click could arrive. The result was a panel where only the
         * dot itself could be hit, never the word beside it.
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
