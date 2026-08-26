import { forwardRef, type Ref } from 'react';
import { DeleteIcon } from '@/src/components/icons';
import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { EditLinkButton } from '@/src/components/EditLinkButton';
import { useTranslation } from '@/src/i18n/context';

type ActivePanel = 'editing' | 'deleting' | null;

/**
 * The two things that can be done to a saved link, as one group.
 *
 * It exists so the popup and the dashboard cannot end up offering the same two
 * actions in different orders, at different sizes or with different behaviour.
 * Both surfaces put it in the same place — the line that carries the link's
 * title — and it stays there while the form below is open. That is the point:
 * the way out of the form is never further away than the way in was, and
 * deleting a link one has just looked at does not first require closing it.
 *
 * Both buttons are disclosures with the same contract: press to open, press
 * again to close, Escape closes, and focus comes back to the button either
 * way.
 */
export function SavedLinkActions({
  title,
  activePanel,
  isEditing,
  formId,
  onToggleEdit,
  onToggleDelete,
  onDelete,
  editButtonRef,
  deleteButtonRef,
}: {
  title: string;
  activePanel?: ActivePanel;
  isEditing?: boolean;
  /** The id of the form the edit button opens, for `aria-controls`. */
  formId: string;
  onToggleEdit: () => void;
  onToggleDelete?: () => void;
  onDelete?: () => void | Promise<void>;
  /**
   * Handed in by the list rather than kept here: after a deletion the list is
   * what knows which link is left to take the focus.
   */
  editButtonRef?: Ref<HTMLButtonElement>;
  deleteButtonRef?: Ref<HTMLButtonElement>;
}) {
  const resolvedActivePanel = activePanel ?? (isEditing ? 'editing' : null);
  const resolvedOnToggleDelete = onToggleDelete;
  const resolvedOnDelete = onDelete;

  return (
    <div className="flex shrink-0 gap-2">
      <EditLinkButton
        ref={editButtonRef}
        title={title}
        isEditing={resolvedActivePanel === 'editing'}
        controls={formId}
        onToggle={onToggleEdit}
      />

      {resolvedOnToggleDelete ? (
        <DeleteIconButton
          ref={deleteButtonRef}
          title={title}
          isActive={resolvedActivePanel === 'deleting'}
          onToggle={resolvedOnToggleDelete}
        />
      ) : (
        <DeleteLinkButton title={title} onDelete={resolvedOnDelete} />
      )}
    </div>
  );
}

const DeleteIconButton = forwardRef<
  HTMLButtonElement,
  {
    title: string;
    isActive: boolean;
    onToggle: () => void;
  }
>(function DeleteIconButton({ title, isActive, onToggle }, ref) {
  const { t } = useTranslation();

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        onToggle();
      }}
      title={t('deleteLink.actionLabel', { title })}
      aria-label={t('deleteLink.actionLabel', { title })}
      aria-pressed={isActive}
      className="cursor-pointer rounded-control border border-line-strong p-2 text-link hover:bg-surface-hover"
    >
      <DeleteIcon />
    </button>
  );
});
