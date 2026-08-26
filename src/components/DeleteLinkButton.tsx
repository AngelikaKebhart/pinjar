import type { Ref } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { DeleteIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';

/**
 * Opens and closes the delete question for one saved link.
 *
 * Deleting is irreversible and there is no undo, so it is confirmed rather
 * than executed on a single stray click (WCAG 2.2 AA, 3.3.4 — the criterion
 * covers deleting data the user controls).
 *
 * A disclosure, exactly like the edit button beside it, and deliberately the
 * same component underneath: it stays put while the question is showing, says
 * so through `aria-expanded`, and pressing it again is the way back. It was
 * once a hand-rolled button reporting `aria-pressed` instead — which says
 * "this control is switched on", not "the thing below is showing" — and came
 * out two pixels taller and a different colour than the pencil next to it.
 *
 * Only the way in is an icon. The question and its two answers stay words:
 * an icon is a good enough hint for something the user can undo by not
 * pressing it, and no hint at all for a decision that is final.
 *
 * The name behind the basket names the link, because "Delete" on its own says
 * nothing when a whole list of them is read out one after another (WCAG 2.2
 * AA, 2.4.6).
 */
export function DeleteLinkButton({
  title,
  isAsking,
  controls,
  onToggle,
  ref,
}: {
  /** Title of the link, so every button says which one it deletes. */
  title: string;
  isAsking: boolean;
  /** The id of the question this button opens. */
  controls: string;
  onToggle: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const { t } = useTranslation();

  return (
    <IconButton
      ref={ref}
      label={t('deleteLink.actionLabel', { title })}
      expanded={isAsking}
      controls={controls}
      onClick={onToggle}
    >
      <DeleteIcon />
    </IconButton>
  );
}
