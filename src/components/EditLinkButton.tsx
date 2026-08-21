import type { Ref } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { EditIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';

/**
 * Opens the form for one saved link.
 *
 * Shared by the dashboard and the popup so that the two cannot drift apart in
 * wording, in looks or in target size. Which of them a link is edited from
 * makes no difference to what editing means.
 *
 * The name behind the pencil names the link, because "Edit" on its own says
 * nothing when a whole list of them is read out one after another (WCAG 2.2
 * AA, 2.4.6).
 *
 * Opening and closing the form stays with the caller: it owns the space the
 * form appears in, and it is the one that has to hand focus back here
 * afterwards — which is why the ref is part of the interface.
 */
export function EditLinkButton({
  title,
  onEdit,
  ref,
}: {
  /** Title of the link, so every button says which one it opens. */
  title: string;
  onEdit: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const { t } = useTranslation();

  return (
    <IconButton ref={ref} label={t('editLink.actionLabel', { title })} onClick={onEdit}>
      <EditIcon />
    </IconButton>
  );
}
