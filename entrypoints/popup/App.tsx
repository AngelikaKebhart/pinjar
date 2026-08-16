import { useTranslation } from '@/src/i18n/context';

/**
 * Popup shown when the toolbar icon is clicked.
 *
 * Scope (see docs/concept.md §3.4): quick-save the current page and list the
 * links already saved for the current domain. Only the shell exists so far.
 */
function App() {
  const { t } = useTranslation();

  const openDashboard = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
  };

  return (
    <main className="w-80 p-4">
      <h1 className="text-base font-semibold">{t('popup.title')}</h1>

      <p className="mt-2 text-sm text-slate-600">{t('popup.notImplemented')}</p>

      <button
        type="button"
        onClick={openDashboard}
        className="mt-4 w-full rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        {t('popup.openDashboard')}
      </button>
    </main>
  );
}

export default App;
