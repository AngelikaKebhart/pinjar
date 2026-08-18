import { useCallback, useEffect, useId, useState } from 'react';
import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { useTranslation } from '@/src/i18n/context';
import type { MessageKey } from '@/src/i18n/messages';
import { getCurrentPage, saveCurrentPage, type CurrentPage } from '@/src/lib/current-page';
import type { SavedLink } from '@/src/lib/saved-link';
import { getSavedLinksForDomain, removeSavedLink } from '@/src/lib/storage';

/**
 * Popup shown when the toolbar icon is clicked.
 *
 * Scope (see docs/concept.md §3.4): save the current page with one click and
 * list what is already saved for the site it belongs to. Assigning category,
 * tags and a note is the dashboard's job for now.
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

  const canSave = page !== null && page.domain !== null;

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

      <section aria-labelledby={savedLinksHeadingId} className="flex flex-col gap-2">
        <h2 id={savedLinksHeadingId} className="text-sm font-medium">
          {t('popup.savedLinks.heading', { domain: page?.domain ?? '' })}
        </h2>

        {links.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('popup.savedLinks.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center gap-2">
                {/*
                  A real link, so it keeps its semantics and middle-click. The
                  popup would otherwise navigate itself; target opens a tab.
                  noreferrer keeps the extension's address off the target site.
                */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 break-words rounded-sm py-1 text-sm text-link underline hover:text-link-strong"
                >
                  {link.title}
                </a>

                <DeleteLinkButton title={link.title} onDelete={() => handleRemove(link)} />
              </li>
            ))}
          </ul>
        )}
      </section>

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
