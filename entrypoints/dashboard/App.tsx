import { useEffect, useId } from 'react';
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';
import { useTranslation } from '@/src/i18n/context';

/**
 * Dashboard opened in its own browser tab.
 *
 * Scope (see docs/concept.md §3.5): list every saved link across all domains,
 * with search and filters for category, tags and status, plus inline editing.
 * Only the shell and the language setting exist so far.
 */
function App() {
  const { t, plural } = useTranslation();
  const settingsHeadingId = useId();

  // Until the storage layer lands there is nothing to count.
  const savedLinkCount = 0;

  // The tab title is user-facing text and has to follow the language switch,
  // so it cannot stay in the static HTML.
  useEffect(() => {
    document.title = t('dashboard.documentTitle');
  }, [t]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('dashboard.subtitle')}</p>
      </header>

      <main className="mt-8">
        <h2 className="text-lg font-medium">{t('dashboard.savedLinks.heading')}</h2>
        <p className="mt-2 text-sm">{plural('dashboard.savedLinks.count', savedLinkCount)}</p>
        <p className="mt-1 text-sm text-slate-600">{t('dashboard.savedLinks.notImplemented')}</p>
      </main>

      {/*
        Without an accessible name a <section> is not exposed as a landmark, so
        it would be missing from the region list a screen reader navigates by.
        Pointing at the heading names it in whichever language is active.
      */}
      <section className="mt-10" aria-labelledby={settingsHeadingId}>
        <h2 id={settingsHeadingId} className="text-lg font-medium">
          {t('settings.heading')}
        </h2>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </section>
    </div>
  );
}

export default App;
