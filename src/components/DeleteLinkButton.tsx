import type { Ref } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { DeleteIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';

/**
 * Opens and closes the delete question for one saved link.
 *
 * Deleting is irreversible and there is no undo, so it is confirmed rather than
 * executed on a single stray click (WCAG 2.2 AA, 3.3.4 — the criterion covers
 * deleting data the user controls).
 *
 * A disclosure like the edit button beside it, and deliberately the same
 * component underneath: `aria-expanded` says "the thing below is showing",
 * where `aria-pressed` would say "this control is switched on".
 *
 * Only the way in is an icon. The question and its two answers stay words: an
 * icon is hint enough for something undone by not pressing it, and no hint at
 * all for a decision that is final.
 *
 * The name names the link, because "Delete" on its own says nothing when a
 * whole list is read out one after another (WCAG 2.2 AA, 2.4.6).
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
