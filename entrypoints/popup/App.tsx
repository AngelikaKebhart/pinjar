import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ActionFeedback, type FeedbackMessage } from '@/src/components/ActionFeedback';
import { AppHeader } from '@/src/components/AppHeader';
import { Button } from '@/src/components/Button';
import { useLinkPanels } from '@/src/components/useLinkPanels';
import { useTranslation } from '@/src/i18n/context';
import { getCurrentPage, saveCurrentPage, type CurrentPage } from '@/src/lib/current-page';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';
import { getSavedLinksForDomain, removeSavedLink, updateSavedLink } from '@/src/lib/storage';
import { SavedLinkRow } from './SavedLinkRow';

/**
 * Popup shown when the toolbar icon is clicked.
 *
 * Scope (docs/concept.md §3.4): save the current page with one click and list
 * what is already saved for the site it belongs to.
 *
 * Category, tags, status and note can be given here too (§3.1), but never on
 * the way: saving stays one click, and every link on the list carries its own
 * button to open the form when it is wanted.
 */
function App() {
  const { t } = useTranslation();
  const [page, setPage] = useState<CurrentPage | null>(null);
  const [links, setLinks] = useState<SavedLink[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // The one line of feedback under the button; null while nothing happened.
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const savedLinksHeadingId = useId();

  // Where focus lands when the last link is deleted — no neighbouring button
  // is left to take it.
  const savedLinksHeadingRef = useRef<HTMLHeadingElement>(null);
  const panels = useLinkPanels(savedLinksHeadingRef);

  const loadLinks = useCallback(async (domain: string | null) => {
    setLinks(domain === null ? [] : await getSavedLinksForDomain(domain));
  }, []);

  useEffect(() => {
    void getCurrentPage().then(async (current) => {
      setPage(current);

      // A page that cannot be saved leaves the button greyed out, and a
      // disabled button giving no reason is a dead end — so the reason is said
      // here rather than on a click the button no longer allows.
      if ((current?.domain ?? null) === null) {
        setFeedback({ key: 'popup.status.unsupportedPage' });
      }

      await loadLinks(current?.domain ?? null);
    });
  }, [loadLinks]);

  const handleSave = async () => {
    if (page === null) {
      return;
    }

    setIsSaving(true);
    const outcome = await saveCurrentPage(page);
    setIsSaving(false);

    setFeedback({ key: `popup.status.${outcome.status}` });
    await loadLinks(page.domain);
  };

  const handleEdit = async (link: SavedLink, edits: SavedLinkEdits) => {
    await updateSavedLink(link.id, edits);
    setFeedback({ key: 'linkFeedback.detailsSaved' });
    await loadLinks(page?.domain ?? null);
  };

  const handleRemove = async (link: SavedLink) => {
    await removeSavedLink(link.id);
    setFeedback({ key: 'linkFeedback.removed', params: { title: link.title } });

    // Before the reload, while the list still says who stood next to the link
    // that just went.
    panels.moveFocusAfterRemoving(links ?? [], link.id);

    await loadLinks(page?.domain ?? null);
  };

  // Nothing is worth rendering before the page is known — except the frame,
  // which does not depend on it.
  if (links === null) {
    return (
      <PopupFrame>
        <p className="text-sm">{t('popup.loading')}</p>
      </PopupFrame>
    );
  }

  // The site the popup was opened over, or `null` for anything that cannot be
  // saved at all — a browser page, a local file, the extension's own pages.
  const currentDomain = page?.domain ?? null;
  const canSave = currentDomain !== null;

  return (
    <PopupFrame>
      <main className="flex flex-col gap-4">
        <Button
          type="button"
          variant="primary"
          onClick={() => void handleSave()}
          disabled={!canSave || isSaving}
        >
          {isSaving ? t('popup.saving') : t('popup.savePage')}
        </Button>

        {/*
          Everything the popup has to say sits in one block between the two
          buttons, so that it keeps the same distance to the button above it as
          to the one below, however much or little there is to show.
        */}
        <div className="flex flex-col gap-2">
          {/*
            Saving, editing and deleting all report here: the only feedback
            saving gives, and after a deletion the only thing left to notice —
            the row that could have said so is gone.
          */}
          <ActionFeedback message={feedback} />

          {/*
            Only where there is a site to list links for. On a browser page the
            heading would name a domain that does not exist, and the list would
            say nothing is saved here yet — of a page that can never hold
            anything.
          */}
          {canSave && (
            <section aria-labelledby={savedLinksHeadingId} className="flex flex-col gap-2">
              <h2
                id={savedLinksHeadingId}
                ref={savedLinksHeadingRef}
                tabIndex={-1}
                className="sr-only"
              >
                {t('popup.savedLinks.heading', { domain: currentDomain })}
              </h2>

              {links.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('popup.savedLinks.empty')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {links.map((link) => (
                    <li key={link.id}>
                      <SavedLinkRow
                        link={link}
                        panels={panels}
                        onDelete={() => handleRemove(link)}
                        onEdit={(edits) => handleEdit(link, edits)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
          }}
        >
          {t('popup.openDashboard')}
        </Button>
      </main>
    </PopupFrame>
  );
}

/**
 * The popup's fixed frame: its padding, and the header on top. The width is
 * not here — it is set on the document in `assets/tailwind.css`, which is the
 * only place Chrome reads it from when it sizes the bubble.
 *
 * The header sits outside whatever the popup can show yet, so it is there while
 * storage is still being read. Drawn only once the links arrived, it would
 * appear a moment later and shove everything below it down, under a pointer
 * already on its way to the save button.
 */
function PopupFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 p-4">
      <AppHeader title={t('popup.title')} size="compact" />
      {children}
    </div>
  );
}

export default App;
