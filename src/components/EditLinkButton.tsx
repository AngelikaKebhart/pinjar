import type { Ref } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { EditIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';

/**
 * Opens and closes the form for one saved link.
 *
 * Shared by the dashboard and the popup so that the two cannot drift apart in
 * wording, in looks or in target size. Which of them a link is edited from
 * makes no difference to what editing means.
 *
 * A disclosure, exactly like the delete button beside it: it stays put while
 * the form is open, says so through `aria-expanded`, and pressing it again is
 * the way back. It used to *replace* itself with the form, which meant the two
 * neighbouring icons behaved nothing alike — one vanished on use, the other
 * did not — and the only way out of the form was its Cancel button.
 *
 * The icon stays a pencil while the form is open rather than turning into a
 * cross. Next to a waste bin, a cross is a coin toss between "close this form"
 * and "remove this link"; the pencil keeps saying which form it owns, and the
 * state is carried by `aria-expanded` and by the filled button.
 *
 * The name behind the pencil names the link, because "Edit" on its own says
 * nothing when a whole list of them is read out one after another (WCAG 2.2
 * AA, 2.4.6). It does not change when the form opens: `aria-expanded` already
 * reports that, and a second wording would have a screen reader announce the
 * same fact twice in different words.
 */
export function EditLinkButton({
  title,
  isEditing,
  controls,
  onToggle,
  ref,
}: {
  /** Title of the link, so every button says which one it opens. */
  title: string;
  isEditing: boolean;
  /** The id of the form this button opens. */
  controls: string;
  onToggle: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const { t } = useTranslation();

  return (
    <IconButton
      ref={ref}
      label={t('editLink.actionLabel', { title })}
      expanded={isEditing}
      controls={controls}
      onClick={onToggle}
    >
      <EditIcon />
    </IconButton>
  );
}
