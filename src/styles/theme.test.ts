import { readdirSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Proves that every color pair the interface actually renders meets WCAG 2.2
 * AA — in both palettes.
 *
 * This exists because contrast is the expensive half of any redesign: picking
 * colors is quick, re-verifying every combination by hand is not, and skipping
 * it is invisible until someone cannot read the interface. Changing a value in
 * assets/tailwind.css now either passes here or fails loudly.
 */

const STYLESHEET = readFileSync(new URL('../../assets/tailwind.css', import.meta.url), 'utf8');

/** Text and images of text (WCAG 1.4.3). */
const TEXT_MINIMUM = 4.5;
/** Controls, their boundaries, and the focus ring (WCAG 1.4.11). */
const UI_MINIMUM = 3;

/** Every pairing that occurs in the components, as foreground on background. */
const TEXT_PAIRS = [
  ['ink', 'canvas'],
  ['ink', 'surface'],
  ['ink', 'surface-hover'],
  ['ink', 'surface-tint'],
  ['ink-muted', 'canvas'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'surface-tint'],
  ['pill-ink', 'pill'],
  ['link', 'canvas'],
  ['link', 'surface'],
  ['link-strong', 'canvas'],
  ['link-strong', 'surface'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-strong'],
  ['on-danger', 'danger'],
  ['on-danger', 'danger-strong'],
  ['on-disabled', 'disabled'],
] as const;

const UI_PAIRS = [
  ['line-strong', 'canvas'],
  ['line-strong', 'surface'],
  ['line-strong', 'surface-tint'],
  ['focus', 'canvas'],
  ['focus', 'surface'],
  ['focus', 'pill'],
  // The wordmark and the rule under the header are graphics, not text.
  ['brand', 'canvas'],
  ['brand', 'surface'],
  // Edit and delete are drawn, so the glyph itself has to be made out — and
  // they are icon buttons, so most of the time they are being hovered.
  ['glyph', 'surface'],
  ['glyph', 'surface-tint'],
  ['glyph', 'surface-hover'],
  /*
   * A filled button has no border: its fill is the whole boundary, so it has
   * to stand off whatever it sits on. On a dark ground this is the pair that
   * fails first, and it did — the dark accent is lifted to clear it.
   */
  ['accent', 'surface'],
  ['accent', 'canvas'],
  ['danger', 'surface'],
] as const;

/**
 * Reads the token values of one palette.
 *
 * Both live in the same `@theme` block: every token is a `light-dark()` pair,
 * so neither palette can quietly lose a token the other has. Which half is
 * read here is the same decision the browser makes from `color-scheme`.
 */
function palette(mode: 'light' | 'dark'): Record<string, string> {
  const block = blockAfter('@theme');
  const tokens: Record<string, string> = {};

  for (const match of block.matchAll(
    /--color-([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi,
  )) {
    const [, name, light, dark] = match;
    const value = mode === 'light' ? light : dark;

    if (name !== undefined && value !== undefined) {
      tokens[name] = value;
    }
  }

  return tokens;
}

function blockAfter(marker: string): string {
  const start = STYLESHEET.indexOf(marker);
  expect(start, `${marker} is missing from the stylesheet`).toBeGreaterThan(-1);

  return STYLESHEET.slice(start, STYLESHEET.indexOf('\n}', start));
}

/** WCAG 2.2 relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

describe.each(['light', 'dark'] as const)('the %s palette', (mode) => {
  const tokens = palette(mode);

  it('defines every token the components use', () => {
    const used = [...TEXT_PAIRS, ...UI_PAIRS].flat();

    expect(Object.keys(tokens)).toEqual(expect.arrayContaining(used));
  });

  it.each(TEXT_PAIRS)('reads %s on %s', (foreground, background) => {
    const ratio = contrastRatio(tokens[foreground] ?? '', tokens[background] ?? '');

    expect(ratio).toBeGreaterThanOrEqual(TEXT_MINIMUM);
  });

  it.each(UI_PAIRS)('makes out %s against %s', (foreground, background) => {
    const ratio = contrastRatio(tokens[foreground] ?? '', tokens[background] ?? '');

    expect(ratio).toBeGreaterThanOrEqual(UI_MINIMUM);
  });
});

// A component reaching for a raw palette color is how one half of the
// interface ends up ignoring the dark palette.
describe('the components', () => {
  /**
   * Every component, found rather than listed.
   *
   * A list kept by hand stops covering the components written after it, and
   * says nothing while it does — which is exactly when the rule is easiest to
   * break unnoticed. Two components had been missing from it for months.
   */
  function componentFiles(): string[] {
    return ['entrypoints', 'src/components'].flatMap((root) =>
      readdirSync(new URL(`../../${root}`, import.meta.url), {
        recursive: true,
        encoding: 'utf8',
      })
        .filter((entry) => entry.endsWith('.tsx') && !entry.includes('.test.'))
        .map((entry) => `${root}/${entry.split(sep).join('/')}`),
    );
  }

  // A guard that found nothing would pass while checking nothing.
  it('finds the components to check', () => {
    expect(componentFiles()).toContain('src/components/StatusLabel.tsx');
    expect(componentFiles().length).toBeGreaterThan(5);
  });

  it('name color roles rather than colors', () => {
    const offenders = componentFiles().filter((file) =>
      /(?:text|bg|border|outline|ring|fill)-(?:slate|gray|zinc|blue|red|green|amber)-\d{2,3}/.test(
        readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
      ),
    );

    expect(offenders).toEqual([]);
  });
});
