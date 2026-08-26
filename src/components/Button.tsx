import { forwardRef } from 'react';
import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'danger' | 'outline' | 'outline-danger';

/**
 * Consolidated button component with semantic variants.
 *
 * All buttons across the extension use one of four styles:
 * - primary: Accent-colored button for main actions (export, save, etc.)
 * - danger: Red button for destructive actions (delete, clear all)
 * - outline: Secondary action (cancel, keep, reset filters)
 * - outline-danger: Outline button with danger text (delete, danger confirmation)
 *
 * The component handles all state variations (disabled, active) via props,
 * eliminating className duplication and ensuring consistency.
 *
 * Forwards its ref to the underlying `<button>` — some callers move focus to
 * a button programmatically (e.g. returning focus after a cancelled
 * confirmation, WCAG 2.2 AA 2.4.3) and need the DOM node for that.
 */
export const Button = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    variant?: ButtonVariant;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    active?: boolean;
    onClick?: () => void | Promise<void>;
    className?: string;
    title?: string;
    'aria-label'?: string;
  }
>(function Button(
  {
    children,
    variant = 'primary',
    type = 'button',
    disabled = false,
    active = false,
    onClick,
    className = '',
    title,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const baseClasses = 'rounded-control px-4 py-2 text-sm font-bold cursor-pointer';

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-accent text-on-accent enabled:hover:bg-accent-strong disabled:bg-disabled disabled:text-on-disabled',
    danger: `bg-danger text-on-danger enabled:hover:bg-danger-strong ${active ? 'active:bg-danger-strong' : ''}`,
    outline:
      'border border-line-strong text-ink enabled:hover:bg-surface-hover disabled:border-line disabled:text-ink-muted',
    'outline-danger': 'border border-line-strong text-danger enabled:hover:bg-surface-hover',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={() => void onClick?.()}
      title={title}
      aria-label={ariaLabel}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
});
