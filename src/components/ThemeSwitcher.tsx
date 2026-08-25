import { useMemo } from 'react';
import { SettingMenu, type SettingOption } from '@/src/components/SettingMenu';
import { ThemeIcon } from '@/src/components/icons';
import { useTheme } from '@/src/components/ThemeProvider';
import { useTranslation } from '@/src/i18n/context';
import { THEME_PREFERENCES, type ThemePreference } from '@/src/lib/theme';

/**
 * Lets the user pick light or dark, or follow the browser.
 *
 * Three answers again, and for the same reason as the language: "automatic" is
 * the default and would be lost by a switch that only toggled.
 *
 * Unlike the languages, the options are named in the interface language —
 * "Hell" and "Dunkel" are ordinary words of this UI, not names of a language
 * the reader might be looking for.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  const options = useMemo<readonly SettingOption<ThemePreference>[]>(
    () =>
      THEME_PREFERENCES.map((option) => ({ value: option, label: t(`settings.theme.${option}`) })),
    [t],
  );

  return (
    <SettingMenu
      icon={<ThemeIcon />}
      label={t('settings.theme.label')}
      options={options}
      value={preference}
      onChange={setPreference}
    />
  );
}
