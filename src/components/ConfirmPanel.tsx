import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { Button } from '@/src/components/Button';

/**
 * The question asked before something is thrown away or merged.
 *
 * A group rather than a dialog: the page behind stays usable, and the question
 * sits next to the thing it asks about. Without the grouping the two answers
 * would stand in the tab order with nothing saying what they answer.
 *
 * The question names that thing in words, not only in the buttons' labels: in a
 * list of rows that look alike, "Delete?" leaves everyone but a screen reader
 * user guessing which one is about to go.
 *
 * Focus goes to the question, not to either answer — deliberately not to the
 * confirming one: a held or repeated Enter, which is what opened the panel,
 * would answer it without a second decision ever being made. The question is
 * the group's accessible name, so arriving there is also what reads it out.
 *
 * Escape and either answer all end in `onCancel`/`onConfirm`; handing focus
 * back afterwards is the caller's job, not this panel's. It cannot do it
 * itself — focus is inside it, and it knows nothing about the button that
 * opened it — and the caller has to decide anyway: after a cancellation that
 * button is still there, after a confirmation the whole row it sat in usually
 * is not, and only the list knows what is left.
 */
export function ConfirmPanel({
  id,
  question,
  hint,
  confirm,
  confirmLabel,
  cancel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  /** Names the panel, so the button that opened it can point at it. */
  id: string;
  question: string;
  /** What confirming will do, where that is not obvious from the question. */
  hint?: string;
  confirm: string;
  /** The confirming button's full name, which says what it acts on. */
  confirmLabel?: string;
  cancel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const questionId = useId();
  const hintId = useId();
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
      aria-describedby={hint === undefined ? undefined : hintId}
      // Focusable on purpose, never by tabbing: focus is moved here when the
      // question appears (WCAG 2.2 AA, 2.4.3), but a group that answered to
      // Tab would be a stop that does nothing.
      tabIndex={-1}
    >
      <p id={questionId} className="text-sm font-bold break-words">
        {question}
      </p>

      {hint !== undefined && (
        <p id={hintId} className="text-sm break-words text-ink-muted">
          {hint}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          onClick={() => void onConfirm()}
          aria-label={confirmLabel}
        >
          {confirm}
        </Button>

        <Button type="button" variant="outline" onClick={onCancel} aria-label={cancelLabel}>
          {cancel}
        </Button>
      </div>
    </div>
  );
}
