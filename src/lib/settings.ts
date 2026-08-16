import { storage } from 'wxt/utils/storage';
import type { LanguagePreference } from '@/src/i18n/messages';

/**
 * User settings, stored locally like everything else in this extension.
 *
 * Only the bare choice is kept — no detected locale, no timestamps. See
 * `.claude/skills/privacy-and-security` on data minimization.
 */
export const languagePreference = storage.defineItem<LanguagePreference>(
  'local:languagePreference',
  { fallback: 'auto' },
);
