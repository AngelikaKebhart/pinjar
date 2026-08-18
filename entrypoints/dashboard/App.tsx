import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';
import { useTranslation } from '@/src/i18n/context';
import { filterSavedLinks, isFiltering, NO_FILTER } from '@/src/lib/filter';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';
import { getSavedLinks, removeSavedLink, savedLinks, updateSavedLink } from '@/src/lib/storage';
import { LinkFilters } from './LinkFilters';
import { SavedLinkCard } from './SavedLinkCard';

/**
 * Dashboard opened in its own browser tab.
 *
 * Scope (see docs/concept.md §3.5): list every saved link across all domains,
 * with search and filters for category, tags and status, plus inline editing.
 * All of that exists; export and import are still to come.
 */
function App() {
  const { t, plural } = useTranslation();
  const [links, setLinks] = useState<SavedLink[] | null>(null);
  const [criteria, setCriteria] = useState(NO_FILTER);
  const settingsHeadingId = useId();
  const savedLinksHeadingId = useId();
  const filtersHeadingId = useId();

  const shown = useMemo(
    () => (links === null ? [] : filterSavedLinks(links, criteria)),
    [links, criteria],
  );

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

  const countText =
    links === null
      ? ''
      : isFiltering(criteria)
        ? t('dashboard.savedLinks.filtered', { count: shown.length, total: links.length })
        : plural('dashboard.savedLinks.count', shown.length);

  /**
   * The same text, announced a moment later.
   *
   * Typing in the search field changes the count on every keystroke; a live
   * region reading each one out loud would talk over the typing. Waiting for
   * a pause announces the result the user actually stopped at.
   *
   * The very first count is not a change anyone needs to be told about, so it
   * appears immediately — a screen reader arriving at the region straight away
   * would otherwise find it empty.
   */
  const [announcement, setAnnouncement] = useState('');
  const hasAnnounced = useRef(false);

  useEffect(() => {
    if (countText === '') {
      return;
    }

    if (!hasAnnounced.current) {
      hasAnnounced.current = true;
      setAnnouncement(countText);
      return;
    }

    const timer = setTimeout(() => setAnnouncement(countText), ANNOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [countText]);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('dashboard.subtitle')}</p>
      </header>

      <section className="mt-8" aria-labelledby={filtersHeadingId}>
        <h2 id={filtersHeadingId} className="mb-3 text-lg font-medium">
          {t('filters.heading')}
        </h2>
        <LinkFilters links={links ?? []} criteria={criteria} onChange={setCriteria} />
      </section>

      <main className="mt-8" aria-labelledby={savedLinksHeadingId}>
        <h2 id={savedLinksHeadingId} className="text-lg font-medium">
          {t('dashboard.savedLinks.heading')}
        </h2>

        {/*
          Two elements for one sentence, and the visible one is hidden from
          assistive technology on purpose: it updates on every keystroke, while
          the spoken one below waits for a pause in typing. Left visible to both,
          the count would be read out twice in a row.
        */}
        <p aria-hidden="true" className="mt-2 text-sm">
          {countText}
        </p>

        {/*
          Carries the count for anyone who cannot see it, and announces every
          change to it. Deleting a link relies on this too: once the card is
          gone there is nothing else to notice.
        */}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {links !== null &&
          (shown.length === 0 ? (
            <p className="mt-6 text-sm">
              {/*
                "Nothing saved yet" and "nothing matches" call for very
                different words: one asks the user to go save something, the
                other to loosen a filter.
              */}
              {links.length === 0
                ? t('dashboard.savedLinks.empty')
                : t('dashboard.savedLinks.noMatches')}
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {shown.map((link) => (
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

/** Long enough to outlast typing, short enough not to feel detached. */
const ANNOUNCE_DELAY_MS = 500;

export default App;
