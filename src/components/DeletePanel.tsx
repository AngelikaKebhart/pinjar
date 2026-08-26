import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { Button } from '@/src/components/Button';
import { useTranslation } from '@/src/i18n/context';

/**
 * The question asked before a saved link is deleted.
 *
 * A group rather than a dialog: the page behind stays usable, and the question
 * sits next to the link it asks about. Without the grouping the two answers
 * would stand in the tab order with nothing saying what they answer.
 *
 * The question names the link in words, not only in the buttons' labels: with
 * three cards that look alike, "Delete?" leaves everyone but a screen reader
 * user guessing which one is about to go.
 *
 * Focus goes to the question, not to either answer — deliberately not to "Yes,
 * delete": a held or repeated Enter, which is what opened the panel, would
 * delete the link without a second decision ever being made.
 *
 * Escape and pressing the button again both hand focus back to that button.
 * Confirming has nowhere to hand it — the panel goes with the link — so where
 * focus lands next is the list's business; only it knows what is left.
 */
export function DeletePanel({
  id,
  title,
  onConfirm,
  onCancel,
}: {
  /** Names the panel, so the button that opened it can point at it. */
  id: string;
  title: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const questionId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    groupRef.current?.focus();
  }, []);

  /*
   * Escape dismisses the question — the same key that closes the form beside it,
   * so there is one way out to learn rather than two. Listened for here rather
   * than on the document, because focus starts inside this panel and only its
   * own two answers can take it away.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the rule guards against a plain element made clickable; this one only listens for Escape, and both answers inside it are real buttons
    <div
      id={id}
      ref={groupRef}
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-3 rounded-card border border-danger p-4"
      role="group"
      aria-labelledby={questionId}
      // Focusable on purpose, never by tabbing: focus is moved here when the
      // question appears (WCAG 2.2 AA, 2.4.3), but a group that answered to
      // Tab would be a stop that does nothing.
      tabIndex={-1}
    >
      <p id={questionId} className="text-sm font-bold break-words">
        {t('deleteLink.question', { title })}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          onClick={() => void onConfirm()}
          aria-label={t('deleteLink.confirmLabel', { title })}
        >
          {t('deleteLink.confirm')}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          aria-label={t('deleteLink.cancelLabel', { title })}
        >
          {t('deleteLink.cancel')}
        </Button>
      </div>
    </div>
  );
}
