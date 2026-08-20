import { createContext, useContext } from 'react';
import type { MessageParams } from './format';
import type { Language, LanguagePreference, MessageKey, PluralMessageKey } from './messages';

export interface Translation {
  /** The language actually being displayed, never "auto". */
  language: Language;
  /** What the user chose, which may be "auto". */
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
  plural: (key: PluralMessageKey, count: number, params?: MessageParams) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  /** Orders user-provided names — categories, tags, status labels — for display. */
  compareNames: (one: string, other: string) => number;
}

const TranslationContext = createContext<Translation | null>(null);

export const TranslationContextProvider = TranslationContext.Provider;

export function useTranslation(): Translation {
  const translation = useContext(TranslationContext);

  if (translation === null) {
    throw new Error('useTranslation must be used inside a TranslationProvider.');
  }

  return translation;
}
