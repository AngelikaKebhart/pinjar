import { useCallback, useEffect, useId, useState } from 'react';
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';
import { useTranslation } from '@/src/i18n/context';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';
import { getSavedLinks, removeSavedLink, savedLinks, updateSavedLink } from '@/src/lib/storage';
import { SavedLinkCard } from './SavedLinkCard';

/**
 * Dashboard opened in its own browser tab.
 *
 * Scope (see docs/concept.md §3.5): list every saved link across all domains,
 * with search and filters for category, tags and status, plus inline editing.
 * The list and deleting exist; search, filters and editing are still to come.
 */
function App() {
  const { t, plural } = useTranslation();
  const [links, setLinks] = useState<SavedLink[] | null>(null);
  const settingsHeadingId = useId();
  const savedLinksHeadingId = useId();

  // Watched rather than read once: the popup can save or delete while this tab
  // stays open, and the list would otherwise sit there being wrong.
  useEffect(() => {
    void getSavedLinks().then(setLinks);

    return savedLinks.watch(setLinks);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await removeSavedLink(id);
  }, []);

  const handleEdit = useCallback(async (id: string, edits: SavedLinkEdits) => {
    await updateSavedLink(id, edits);
  }, []);

  // The tab title is user-facing text and has to follow the language switch,
  // so it cannot stay in the static HTML.
  useEffect(() => {
    document.title = t('dashboard.documentTitle');
  }, [t]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('dashboard.subtitle')}</p>
      </header>

      <main className="mt-8" aria-labelledby={savedLinksHeadingId}>
        <h2 id={savedLinksHeadingId} className="text-lg font-medium">
          {t('dashboard.savedLinks.heading')}
        </h2>

        {/*
          Announced on change, because deleting a link gives no other feedback
          once the card is gone.
        */}
        <p aria-live="polite" className="mt-2 text-sm">
          {links === null ? '' : plural('dashboard.savedLinks.count', links.length)}
        </p>

        <p className="mt-1 text-sm text-ink-muted">
          {t('dashboard.savedLinks.searchNotImplemented')}
        </p>

        {links !== null &&
          (links.length === 0 ? (
            <p className="mt-6 text-sm">{t('dashboard.savedLinks.empty')}</p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {links.map((link) => (
                <li key={link.id}>
                  <SavedLinkCard
                    link={link}
                    onDelete={() => handleDelete(link.id)}
                    onEdit={(edits) => handleEdit(link.id, edits)}
                  />
                </li>
              ))}
            </ul>
          ))}
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
