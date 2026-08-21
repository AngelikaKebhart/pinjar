import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { themePreference } from '@/src/lib/settings';
import { applyThemePreference, type ThemePreference } from '@/src/lib/theme';

/**
 * Applies the stored color scheme to the document, and lets the switcher
 * change it.
 *
 * Popup and dashboard are separate documents, so each mounts its own provider.
 * Both watch the stored preference, which is why switching the scheme in the
 * dashboard also reaches an open popup — the same arrangement the language
 * already uses.
 */

interface Theme {
  /** What the user chose, which may be "auto". */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // null means "not read from storage yet", which is distinct from "auto".
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let isMounted = true;

    // A failed read must still resolve to something: "auto" costs the user
    // their stored choice, an unhandled rejection would cost them the UI.
    void themePreference
      .getValue()
      .catch(() => 'auto' as const)
      .then((stored) => {
        if (isMounted) {
          setPreference(stored);
        }
      });

    const unwatch = themePreference.watch((stored) => setPreference(stored));

    return () => {
      isMounted = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    if (preference !== null) {
      applyThemePreference(document.documentElement, preference);
    }
  }, [preference]);

  // Render only once the stored preference is known, otherwise a dark
  // interface would flash light on every open.
  if (preference === null) {
    return null;
  }

  const theme: Theme = {
    preference,
    setPreference: (next) => {
      // Update immediately so the UI does not wait on the storage write.
      setPreference(next);
      void themePreference.setValue(next);
    },
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (theme === null) {
    throw new Error('useTheme must be used inside a ThemeProvider.');
  }

  return theme;
}
