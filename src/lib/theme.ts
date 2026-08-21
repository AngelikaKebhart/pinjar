/**
 * The colors the interface is drawn in: light, dark, or whatever the browser
 * says.
 *
 * Nothing here decides what a color *is* — that lives in assets/tailwind.css.
 * This only carries the user's answer to "which of the two palettes", which
 * the stylesheet then reads off the `color-scheme` in force.
 */

export const THEME_PREFERENCES = ['auto', 'light', 'dark'] as const;

/** What the user picked; "auto" means "follow the browser". */
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Guards a value read back from storage or from a `<select>`. */
export function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Puts the preference where the stylesheet looks for it.
 *
 * "auto" removes the attribute rather than writing it out: the absence of an
 * answer is what lets `color-scheme: light dark` do its job, and an attribute
 * saying "auto" would need its own rule to mean the same thing.
 */
export function applyThemePreference(root: HTMLElement, preference: ThemePreference): void {
  if (preference === 'auto') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
}
