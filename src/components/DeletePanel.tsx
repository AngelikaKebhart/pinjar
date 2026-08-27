import { ConfirmPanel } from '@/src/components/ConfirmPanel';
import { useTranslation } from '@/src/i18n/context';

/**
 * The question asked before a saved link is deleted, in popup and dashboard
 * alike. What it looks like and how it behaves is `ConfirmPanel`'s business;
 * what is left here is the wording, so the two surfaces cannot ask differently.
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

  return (
    <ConfirmPanel
      id={id}
      question={t('deleteLink.question', { title })}
      confirm={t('deleteLink.confirm')}
      confirmLabel={t('deleteLink.confirmLabel', { title })}
      cancel={t('deleteLink.cancel')}
      cancelLabel={t('deleteLink.cancelLabel', { title })}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
