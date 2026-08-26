import { storage } from 'wxt/utils/storage';
import type { LanguagePreference } from '@/src/i18n/messages';
import type { ThemePreference } from './theme';

/**
 * User settings, stored locally like everything else. Only the bare choice is
 * kept — no detected locale, no resolved theme, no timestamps (data
 * minimization; see `.claude/skills/privacy-and-security`).
 */
export const languagePreference = storage.defineItem<LanguagePreference>(
  'local:languagePreference',
  { fallback: 'auto' },
);

export const themePreference = storage.defineItem<ThemePreference>('local:themePreference', {
  fallback: 'auto',
});
