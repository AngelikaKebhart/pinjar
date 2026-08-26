import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { Button } from '@/src/components/Button';
import { useTranslation } from '@/src/i18n/context';

/**
 * The question asked before a saved link is deleted.
 *
 * A group rather than a dialog: the page behind stays usable, nothing needs
 * trapping, and the question sits next to the link it is asking about. Without
 * the grouping the two answers would stand in the tab order with nothing
 * saying what they answer.
 *
 * The question names the link in words, not only in the buttons' labels: with
 * three cards that look alike, "Delete?" on its own leaves everyone but a
 * screen reader user guessing which one is about to go.
 *
 * Opening puts focus on the question rather than on either answer: what has
 * just appeared is a question, and a keyboard user must not have to hunt for
 * it. Deliberately not on "Yes, delete" — a held or repeated Enter, which is
 * what opened the panel in the first place, would then delete the link without
 * a second decision ever being made, and a confirmation nobody had to answer
 * is no confirmation.
 *
 * Both ways back — Escape and pressing the button again — hand focus to the
 * button that opened it. Confirming is the one case with nowhere to hand it:
 * the link is gone and this panel with it, so where the focus goes next is the
 * list's business, since only the list knows what is left.
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
   * Escape dismisses the question — the same key that closes the form beside
   * it, so there is one way out to learn rather than two. Listened for here
   * rather than on the document because focus starts inside this panel and the
   * only controls that can take it from here are its own two answers.
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
      // Focusable only on purpose, never by tabbing: focus is moved here when
      // the question appears (WCAG 2.2 AA, 2.4.3), but a group that answers
      // to Tab would be a stop that does nothing.
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
