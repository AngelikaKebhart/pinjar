/**
 * The PinJar mark: a lidded jar with three pins inside it.
 *
 * `scripts/build-icon.mjs` holds the same numbers again, because it rasterizes
 * to PNG without a browser and cannot read a React component. **Changing the
 * shape means changing both.**
 *
 * They differ in one deliberate way: the toolbar icon fills its glass white,
 * sitting on browser chrome we do not control, while here the glass is left
 * empty so the header shows through it in either palette.
 *
 * Decoration, hidden from assistive technology: it never appears without the
 * wordmark beside it, and "PinJar, PinJar" is not worth reading out.
 */
export function JarMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="none"
    >
      <rect x="7" y="2" width="10" height="3" rx="1.3" className="fill-brand" />
      <rect x="8.4" y="4.6" width="7.2" height="2" rx="0.3" className="fill-brand" />
      <rect
        x="5.75"
        y="7.35"
        width="12.5"
        height="13.9"
        rx="3.25"
        strokeWidth="1.5"
        className="stroke-brand"
      />
      <circle cx="9.3" cy="13" r="1.5" className="fill-glyph" />
      <circle cx="14.2" cy="11.3" r="1.5" className="fill-glyph" />
      <circle cx="12" cy="17.2" r="1.5" className="fill-glyph" />
    </svg>
  );
}
