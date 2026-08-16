import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { languagePreference } from '@/src/lib/settings';
import { TranslationContextProvider } from './context';
import type { Translation } from './context';
import { formatDate, formatNumber, translate, translatePlural } from './format';
import { resolveLanguage } from './language';
import { CATALOGS } from './messages';
import type { LanguagePreference } from './messages';

/**
 * Makes the active language and the translation functions available to the tree.
 *
 * Popup and Dashboard are separate documents, so each mounts its own provider.
 * Both watch the stored preference, which is why switching the language in the
 * Dashboard also reaches an open Popup.
 */
export function TranslationProvider({ children }: { children: ReactNode }) {
  // null means "not read from storage yet", which is distinct from "auto".
  const [preference, setPreference] = useState<LanguagePreference | null>(null);

  useEffect(() => {
    let isMounted = true;

    void languagePreference.getValue().then((stored) => {
      if (isMounted) {
        setPreference(stored);
      }
    });

    const unwatch = languagePreference.watch((stored) => setPreference(stored));

    return () => {
      isMounted = false;
      unwatch();
    };
  }, []);

  const language = resolveLanguage(preference ?? 'auto', navigator.language);

  // WCAG 3.1.1: screen readers pick pronunciation from this, so it has to
  // follow the language switch rather than stay at the value in the HTML file.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const translation = useMemo<Translation>(() => {
    const catalog = CATALOGS[language];

    return {
      language,
      preference: preference ?? 'auto',
      setPreference: (next) => {
        // Update immediately so the UI does not wait on the storage write.
        setPreference(next);
        void languagePreference.setValue(next);
      },
      t: (key, params) => translate(catalog, key, params),
      plural: (key, count, params) => translatePlural(catalog, language, key, count, params),
      formatNumber: (value, options) => formatNumber(language, value, options),
      formatDate: (value, options) => formatDate(language, value, options),
    };
  }, [language, preference]);

  // Render only once the stored preference is known, otherwise the UI would
  // flash the browser language before switching to the chosen one.
  if (preference === null) {
    return null;
  }

  return <TranslationContextProvider value={translation}>{children}</TranslationContextProvider>;
}
