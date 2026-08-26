import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ActionFeedback, type FeedbackMessage } from '@/src/components/ActionFeedback';
import { useLinkPanels } from '@/src/components/useLinkPanels';
import { useTranslation } from '@/src/i18n/context';
import { filterSavedLinks, isFiltering, NO_FILTER } from '@/src/lib/filter';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';
import { getSavedLinks, removeSavedLink, savedLinks, updateSavedLink } from '@/src/lib/storage';
import { DashboardHeader } from './DashboardHeader';
import { LinkFilters } from './LinkFilters';
import { SavedLinkCard } from './SavedLinkCard';

/**
 * Dashboard opened in its own browser tab.
 *
 * Scope (docs/concept.md §3.5): every saved link across all domains, with
 * search and filters for category, tags, status and domain, plus inline
 * editing. Carrying the data in and out (§3.6) and the two settings live in the
 * header, one icon button each.
 */
function App() {
  const { t, plural } = useTranslation();
  const [links, setLinks] = useState<SavedLink[] | null>(null);
  const [criteria, setCriteria] = useState(NO_FILTER);
  // What just happened to a link; null until something has.
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const savedLinksHeadingId = useId();
  const filtersHeadingId = useId();

  // Where focus lands when the last card is deleted — no neighbouring button
  // is left to take it.
  const savedLinksHeadingRef = useRef<HTMLHeadingElement>(null);
  const panels = useLinkPanels(savedLinksHeadingRef);

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

  const handleDelete = async (link: SavedLink) => {
    await removeSavedLink(link.id);
    setFeedback({ key: 'linkFeedback.removed', params: { title: link.title } });

    // `shown` is still the list as drawn, which says who stood next to the
    // card that just went.
    panels.moveFocusAfterRemoving(shown, link.id);
  };

  const handleEdit = async (link: SavedLink, edits: SavedLinkEdits) => {
    await updateSavedLink(link.id, edits);
    setFeedback({ key: 'linkFeedback.detailsSaved' });
  };

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
   * The same text, announced a moment later: typing changes the count on every
   * keystroke, and a live region reading each one out would talk over the
   * typing, so waiting for a pause announces the result stopped at.
   *
   * The first count is no change anyone needs telling about and appears at
   * once — a screen reader arriving straight away would otherwise find the
   * region empty.
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
      <DashboardHeader />

      <section className="mt-8" aria-labelledby={filtersHeadingId}>
        <h2 id={filtersHeadingId} className="mb-3 text-lg font-medium">
          {t('filters.heading')}
        </h2>
        <LinkFilters links={links ?? []} criteria={criteria} onChange={setCriteria} />
      </section>

      <main className="mt-8" aria-labelledby={savedLinksHeadingId}>
        <h2
          id={savedLinksHeadingId}
          ref={savedLinksHeadingRef}
          tabIndex={-1}
          className="text-lg font-medium"
        >
          {t('dashboard.savedLinks.heading')}
        </h2>

        {/*
          Two elements for one sentence: this one updates on every keystroke and
          is hidden from assistive technology, while the spoken one below waits
          for a pause. Left to both, the count would be read out twice.
        */}
        <p aria-hidden="true" className="mt-2 text-sm">
          {countText}
        </p>

        {/*
          Carries the count for anyone who cannot see it, and announces every
          change to it.
        */}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {/*
          What was done to a link, as against how many are left: saving an edit
          changes a card that may be off screen and moves no count, and a
          deleted card cannot report its own disappearance.
        */}
        <ActionFeedback message={feedback} />

        {links !== null &&
          (shown.length === 0 ? (
            <p className="mt-6 text-sm">
              {/*
                "Nothing saved yet" asks the user to go save something; "nothing
                matches" asks them to loosen a filter.
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
                    panels={panels}
                    onDelete={() => handleDelete(link)}
                    onEdit={(edits) => handleEdit(link, edits)}
                  />
                </li>
              ))}
            </ul>
          ))}
      </main>
    </div>
  );
}

/** Long enough to outlast typing, short enough not to feel detached. */
const ANNOUNCE_DELAY_MS = 500;

export default App;
