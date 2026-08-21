import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from '@/src/i18n/context';
import type { MessageKey } from '@/src/i18n/messages';
import { getCurrentPage, saveCurrentPage, type CurrentPage } from '@/src/lib/current-page';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';
import { getSavedLinksForDomain, removeSavedLink, updateSavedLink } from '@/src/lib/storage';
import { SavedLinkRow } from './SavedLinkRow';

/**
 * Popup shown when the toolbar icon is clicked.
 *
 * Scope (see docs/concept.md §3.4): save the current page with one click and
 * list what is already saved for the site it belongs to.
 *
 * Category, tags, status and note can be given here as well (§3.1), but never
 * on the way: saving is one click and stays one click, and every link on the
 * list carries its own button to open the form when it is wanted.
 */
function App() {
  const { t } = useTranslation();
  const [page, setPage] = useState<CurrentPage | null>(null);
  const [links, setLinks] = useState<SavedLink[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // The one line of feedback under the button; null while nothing happened.
  const [statusKey, setStatusKey] = useState<MessageKey | null>(null);
  const savedLinksHeadingId = useId();

  const loadLinks = useCallback(async (domain: string | null) => {
    setLinks(domain === null ? [] : await getSavedLinksForDomain(domain));
  }, []);

  useEffect(() => {
    void getCurrentPage().then(async (current) => {
      setPage(current);

      // A page that cannot be saved leaves the button greyed out, and a
      // disabled button that gives no reason is a dead end. Said here rather
      // than on click, which is exactly what the button no longer allows.
      if ((current?.domain ?? null) === null) {
        setStatusKey('popup.status.unsupportedPage');
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

    setStatusKey(`popup.status.${outcome.status}`);
    await loadLinks(page.domain);
  };

  const handleEdit = async (link: SavedLink, edits: SavedLinkEdits) => {
    await updateSavedLink(link.id, edits);
    setStatusKey('popup.status.detailsSaved');
    await loadLinks(page?.domain ?? null);
  };

  const handleRemove = async (link: SavedLink) => {
    await removeSavedLink(link.id);
    setStatusKey('popup.status.removed');
    await loadLinks(page?.domain ?? null);
  };

  // Nothing is worth rendering before we know which page we are looking at.
  if (links === null) {
    return (
      <main className="w-80 p-4">
        <p className="text-sm">{t('popup.loading')}</p>
      </main>
    );
  }

  // The site the popup was opened over, or `null` for anything that cannot be
  // saved at all — a browser page, a local file, the extension's own pages.
  const currentDomain = page?.domain ?? null;
  const canSave = currentDomain !== null;

  return (
    <main className="flex w-80 flex-col gap-4 p-4">
      <h1 className="text-base font-semibold">{t('popup.title')}</h1>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave || isSaving}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong disabled:bg-disabled disabled:text-on-disabled"
        >
          {isSaving ? t('popup.saving') : t('popup.savePage')}
        </button>

        {/*
          Announced rather than only shown: saving gives no other feedback, and
          the message stays until the next action instead of disappearing on a
          timer the user cannot outrun (WCAG 2.2 AA).
        */}
        <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {statusKey === null ? '' : t(statusKey)}
        </p>
      </div>

      {/*
        Only where there is a site to list links for. On a browser page the
        heading would name a domain that does not exist, and the list would
        claim that nothing is saved here yet — where "here" is a page that can
        never hold anything.
      */}
      {canSave && (
        <section aria-labelledby={savedLinksHeadingId} className="flex flex-col gap-2">
          <h2 id={savedLinksHeadingId} className="text-sm font-medium">
            {t('popup.savedLinks.heading', { domain: currentDomain })}
          </h2>

          {links.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('popup.savedLinks.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.id}>
                  <SavedLinkRow
                    link={link}
                    onDelete={() => handleRemove(link)}
                    onEdit={(edits) => handleEdit(link, edits)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          void browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
        }}
        className="rounded-md border border-line-strong px-3 py-2 text-sm font-medium hover:bg-surface-hover"
      >
        {t('popup.openDashboard')}
      </button>
    </main>
  );
}

export default App;
