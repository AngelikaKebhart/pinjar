import { forwardRef } from 'react';
import type { ReactNode } from 'react';

/**
 * A button in one of the four treatments the interface uses.
 *
 * `primary` is filled and carries the main action of whatever it sits in;
 * `danger` is filled and confirms something irreversible. The two outlines are
 * both secondary, and the difference between them is which red they are drawn
 * in rather than how loud they are:
 *
 * - `outline` is ink, for the way out of something — Cancel, Keep, Reset.
 * - `outline-strong` is the palette's red, for an action that has to be
 *   findable without being the first thing the eye lands on. Deleting
 *   everything is the one that needs it: the whole palette is red, so colour
 *   cannot mark it out — its weight does (WCAG 2.2 AA, 1.4.1).
 *
 * `outline-strong` uses `text-link`, not the more direct `text-danger`:
 * `danger` on `surface-hover` comes to 3.22:1 in the dark palette, so the label
 * would fail 1.4.3 the moment the pointer touched it. `link` clears both.
 *
 * Forwards its ref, because some callers move focus to a button themselves
 * (returning it after a cancelled confirmation, WCAG 2.2 AA 2.4.3).
 *
 * `expanded`/`controls` are for the ones that open something underneath them,
 * the same disclosure contract `IconButton` carries — a text button needs it
 * wherever the icon-only one would (4.1.2).
 */
type ButtonVariant = 'primary' | 'danger' | 'outline' | 'outline-strong';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent enabled:hover:bg-accent-strong disabled:bg-disabled disabled:text-on-disabled',
  danger: 'bg-danger text-on-danger enabled:hover:bg-danger-strong',
  outline:
    'border border-line-strong text-ink enabled:hover:bg-surface-hover disabled:border-line disabled:text-ink-muted',
  'outline-strong':
    'border border-line-strong text-link enabled:hover:bg-surface-hover disabled:border-line disabled:text-ink-muted',
};

export const Button = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    variant?: ButtonVariant;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onClick?: () => void | Promise<void>;
    className?: string;
    title?: string;
    'aria-label'?: string;
    /** The id of a sentence explaining the button — why it is greyed out, say. */
    'aria-describedby'?: string;
    /** Set on a button that reveals something, to say whether it is showing. */
    expanded?: boolean;
    /** The id of what `expanded` refers to. */
    controls?: string;
  }
>(function Button(
  {
    children,
    variant = 'primary',
    type = 'button',
    disabled = false,
    onClick,
    className = '',
    title,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    expanded,
    controls,
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={() => void onClick?.()}
      title={title}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={expanded}
      aria-controls={controls}
      className={`rounded-control px-4 py-2 text-sm font-bold ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
});
