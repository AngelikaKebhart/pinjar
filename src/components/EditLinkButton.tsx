import type { Ref } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { EditIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';

/**
 * Opens and closes the form for one saved link.
 *
 * Shared by dashboard and popup, so the two cannot drift apart in wording,
 * looks or target size.
 *
 * A disclosure, exactly like the delete button beside it: it stays put while
 * the form is open, says so through `aria-expanded`, and pressing it again is
 * the way back — never replacing itself with the form, which would leave two
 * neighbouring icons behaving nothing alike and Cancel as the only way out.
 *
 * The icon stays a pencil rather than turning into a cross: next to a waste
 * bin, a cross is a coin toss between "close this form" and "remove this
 * link". The state is carried by `aria-expanded` and by the filled button.
 *
 * The name names the link, because "Edit" on its own says nothing when a whole
 * list is read out one after another (WCAG 2.2 AA, 2.4.6). It does not change
 * when the form opens — `aria-expanded` already reports that, and a second
 * wording would announce the same fact twice.
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
