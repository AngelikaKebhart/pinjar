import { useRef } from 'react';
import { DeleteIcon } from '@/src/components/icons';
import { PopoverButton } from '@/src/components/PopoverButton';
import { useTranslation } from '@/src/i18n/context';

/**
 * Deletes a saved link, asking once before it does.
 *
 * Deleting is irreversible and there is no undo, so it is confirmed rather
 * than executed on a single stray click (WCAG 2.2 AA, 3.3.4 — the criterion
 * covers deleting data the user controls).
 *
 * The question is a panel hanging off the button rather than a modal dialog:
 * it needs no focus trap, it cannot be missed behind the window, and it stays
 * next to the thing it is asking about. It used to *replace* the button, which
 * meant the question had to fit into the width of a row of icons and came out
 * crushed against the edge of the card — and pressing the button again was no
 * way back out, because by then there was no button.
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

  /*
   * Opening puts focus on the answer rather than leaving it on the button:
   * the question is what has just appeared, and a keyboard user must not have
   * to hunt for it. Both ways back — Escape and pressing the button again —
   * return focus to the button, which `PopoverButton` handles.
   *
   * Confirming is the one case with nowhere to hand focus: the link is gone
   * and this component with it. What happened is announced by the count in the
   * list, which is a live region.
   */
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <PopoverButton
      label={t('deleteLink.actionLabel', { title })}
      icon={<DeleteIcon />}
      initialFocusRef={confirmRef}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold">{t('deleteLink.question')}</p>

          <div className="flex flex-wrap gap-2">
            <button
              ref={confirmRef}
              type="button"
              onClick={() => void onDelete()}
              aria-label={t('deleteLink.confirmLabel', { title })}
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-on-danger hover:bg-danger-strong"
            >
              {t('deleteLink.confirm')}
            </button>

            <button
              type="button"
              onClick={close}
              aria-label={t('deleteLink.cancelLabel', { title })}
              className="rounded-control border border-line-strong px-4 py-2 text-sm font-bold text-ink hover:bg-surface-hover"
            >
              {t('deleteLink.cancel')}
            </button>
          </div>
        </div>
      )}
    </PopoverButton>
  );
}
