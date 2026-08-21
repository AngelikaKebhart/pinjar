import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { DeleteIcon } from '@/src/components/icons';
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
 *
 * Only the way in is an icon. The question and its two answers stay words:
 * an icon is a good enough hint for something the user can undo by not
 * pressing it, and no hint at all for a decision that is final.
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);

  /*
   * Whichever button is on screen replaces the one that was pressed, so focus
   * has to be handed over both ways — it would otherwise fall back to the
   * document, and a keyboard user would tab in again from the top of a list
   * that may be long. Asking moves it to the answer, dismissing moves it back
   * to the button that asked.
   *
   * Confirming is the one case with nowhere to hand it: the link is gone and
   * this component with it. What happened is announced by the status line the
   * caller updates.
   */
  useEffect(() => {
    if (isAsking) {
      confirmRef.current?.focus();
    } else if (wasAsking.current) {
      triggerRef.current?.focus();
    }

    wasAsking.current = isAsking;
  }, [isAsking]);

  if (!isAsking) {
    return (
      <IconButton
        ref={triggerRef}
        label={t('deleteLink.actionLabel', { title })}
        onClick={() => setIsAsking(true)}
      >
        <DeleteIcon />
      </IconButton>
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
        className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-on-danger hover:bg-danger-strong"
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
  'rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover';
