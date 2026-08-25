import type { ReactNode, Ref } from 'react';
import { ChevronIcon } from '@/src/components/icons';

/**
 * A `<select>` with the drop-down arrow drawn by us rather than by the browser.
 *
 * The native arrow cannot be moved: Chrome paints it as part of the widget,
 * hard against the inline end of the box, and no amount of padding shifts it —
 * so it sits on the border instead of inside the field, and it is painted in
 * the platform's colour rather than the palette's. `appearance: none` turns
 * the widget off and this puts the same shape back where the design has it.
 *
 * What stays native is everything that matters: it is still a real `<select>`,
 * so the browser opens and draws the list of options itself, with its own
 * keyboard handling, its own type-ahead and its own announcement. The one
 * thing `appearance: none` does not reach is that list.
 */
export function Select({
  id,
  value,
  onChange,
  children,
  ref,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The `<option>` elements. */
  children: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}) {
  return (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-field border border-line-strong bg-surface py-2 pr-10 pl-3 text-sm text-ink"
      >
        {children}
      </select>

      {/*
        Decoration on top of the field, and no obstacle to using it: without
        `pointer-events-none` the arrow would swallow the click that is meant
        to open the very list it points at.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-glyph"
      >
        <ChevronIcon />
      </span>
    </div>
  );
}
