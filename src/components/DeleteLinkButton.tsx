import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/src/i18n/context';

/**
 * Deletes a saved link, asking once before it does.
 *
 * Deleting is irreversible and there is no undo, so it is confirmed rather
 * than executed on a single stray click (WCAG 2.2 AA, 3.3.4 — the criterion
 * covers deleting data the user controls).
 *
 * The confirmation is inline rather than a dialog: it needs no focus trap, it
 * cannot be missed behind the window, and it keeps the answer next to the
 * thing being answered about.
 */
export function DeleteLinkButton({
  title,
  onDelete,
}: {
  /** Title of the link, so every button says which one it deletes. */
  title: string;
  onDelete: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // The button the user pressed is replaced by this pair, so focus has to be
  // handed over — it would otherwise fall back to the document.
  useEffect(() => {
    if (isAsking) {
      confirmRef.current?.focus();
    }
  }, [isAsking]);

  if (!isAsking) {
    return (
      <button
        type="button"
        onClick={() => setIsAsking(true)}
        aria-label={t('deleteLink.actionLabel', { title })}
        className={ACTION_CLASSES}
      >
        {t('deleteLink.action')}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">{t('deleteLink.question')}</span>

      <button
        ref={confirmRef}
        type="button"
        onClick={() => void onDelete()}
        aria-label={t('deleteLink.confirmLabel', { title })}
        className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
      >
        {t('deleteLink.confirm')}
      </button>

      <button
        type="button"
        onClick={() => setIsAsking(false)}
        aria-label={t('deleteLink.cancelLabel', { title })}
        className={ACTION_CLASSES}
      >
        {t('deleteLink.cancel')}
      </button>
    </div>
  );
}

/** Bordered rather than filled, so the destructive answer stands out alone. */
const ACTION_CLASSES =
  'rounded-md border border-slate-500 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';
