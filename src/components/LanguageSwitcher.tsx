import { useId } from 'react';
import { useTranslation } from '@/src/i18n/context';
import { isLanguagePreference, LANGUAGE_NAMES } from '@/src/i18n/language';
import { LANGUAGES } from '@/src/i18n/messages';

/**
 * Lets the user pick the interface language, or follow the browser.
 *
 * A plain labelled `<select>` on purpose: it is keyboard operable, announced
 * correctly and localized by the browser itself, none of which a custom
 * dropdown would provide for free.
 */
export function LanguageSwitcher() {
  const { t, preference, setPreference } = useTranslation();
  const selectId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium">
        {t('settings.language.label')}
      </label>

      <select
        id={selectId}
        value={preference}
        onChange={(event) => {
          if (isLanguagePreference(event.target.value)) {
            setPreference(event.target.value);
          }
        }}
        className="w-fit min-w-56 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm"
      >
        <option value="auto">{t('settings.language.auto')}</option>

        {LANGUAGES.map((language) => (
          // lang= marks the option as being in another language than the page,
          // so a screen reader pronounces "Deutsch" and "English" correctly
          // (WCAG 3.1.2).
          <option key={language} value={language} lang={language}>
            {LANGUAGE_NAMES[language]}
          </option>
        ))}
      </select>
    </div>
  );
}
