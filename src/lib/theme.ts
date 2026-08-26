/**
 * The colors the interface is drawn in: light, dark, or whatever the browser
 * says. Nothing here decides what a color *is* — that lives in
 * assets/tailwind.css, which reads this off the `color-scheme` in force.
 */

export const THEME_PREFERENCES = ['auto', 'light', 'dark'] as const;

/** What the user picked; "auto" means "follow the browser". */
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/**
 * Puts the preference where the stylesheet looks for it. "auto" removes the
 * attribute rather than writing it out: the absence of an answer is what lets
 * `color-scheme: light dark` do its job.
 */
export function applyThemePreference(root: HTMLElement, preference: ThemePreference): void {
  if (preference === 'auto') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
}
