import { useId } from 'react';
import { useTheme } from '@/src/components/ThemeProvider';
import { useTranslation } from '@/src/i18n/context';
import { isThemePreference, THEME_PREFERENCES } from '@/src/lib/theme';

/**
 * Lets the user pick light or dark, or follow the browser.
 *
 * A plain labelled `<select>`, for the same reasons as the language switcher:
 * keyboard operable, announced correctly, and drawn by the browser itself.
 *
 * Unlike the languages, the options are named in the interface language —
 * "Hell" and "Dunkel" are ordinary words of this UI, not names of a language
 * the reader might be looking for.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const selectId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium">
        {t('settings.theme.label')}
      </label>

      <select
        id={selectId}
        value={preference}
        onChange={(event) => {
          if (isThemePreference(event.target.value)) {
            setPreference(event.target.value);
          }
        }}
        className="w-fit min-w-56 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm"
      >
        {THEME_PREFERENCES.map((option) => (
          <option key={option} value={option}>
            {t(`settings.theme.${option}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
