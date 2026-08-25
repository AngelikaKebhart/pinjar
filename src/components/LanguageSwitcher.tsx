import { useMemo } from 'react';
import { SettingMenu, type SettingOption } from '@/src/components/SettingMenu';
import { LanguageIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';
import { LANGUAGE_NAMES } from '@/src/i18n/language';
import { LANGUAGES, type LanguagePreference } from '@/src/i18n/messages';

/**
 * Lets the user pick the interface language, or follow the browser.
 *
 * Three answers, not two: "automatic" is the documented default (docs/concept.md
 * §3.7) and has to remain reachable, so this is a menu rather than a button
 * that flips between German and English.
 */
export function LanguageSwitcher() {
  const { t, preference, setPreference } = useTranslation();

  const options = useMemo<readonly SettingOption<LanguagePreference>[]>(
    () => [
      { value: 'auto', label: t('settings.language.auto') },
      // Each language is named in itself, so it stays readable for a user who
      // ended up in one they do not speak — and `lang` tells the screen reader
      // to pronounce it that way (WCAG 3.1.2).
      ...LANGUAGES.map((language) => ({
        value: language,
        label: LANGUAGE_NAMES[language],
        lang: language,
      })),
    ],
    [t],
  );

  return (
    <SettingMenu
      icon={<LanguageIcon />}
      label={t('settings.language.label')}
      options={options}
      value={preference}
      onChange={setPreference}
    />
  );
}
