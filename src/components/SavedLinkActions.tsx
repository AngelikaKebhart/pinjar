import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { EditLinkButton } from '@/src/components/EditLinkButton';
import type { LinkPanels } from '@/src/components/useLinkPanels';

/**
 * The two things that can be done to a saved link, as one group.
 *
 * It exists so the popup and the dashboard cannot end up offering the same two
 * actions in different orders, at different sizes or with different behaviour.
 * Both surfaces put it in the same place — the line that carries the link's
 * title — and it stays there while whatever it opened sits below. That is the
 * point: the way out is never further away than the way in was, and deleting
 * a link one has just looked at does not first require closing it.
 *
 * Both buttons are disclosures with the same contract, because both are the
 * same component: press to open, press again to close, Escape closes, and
 * focus comes back to the button either way. It takes the whole `panels`
 * object rather than a handful of booleans and callbacks so that there is one
 * answer to "what is open" for the entire list, not one per row.
 */
export function SavedLinkActions({
  id,
  title,
  panels,
  formId,
  questionId,
}: {
  /** The link these buttons act on. */
  id: string;
  title: string;
  panels: LinkPanels;
  /** The id of the form the edit button opens, for `aria-controls`. */
  formId: string;
  /** The id of the question the delete button opens, for the same reason. */
  questionId: string;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <EditLinkButton
        ref={(button) => panels.rememberEditButton(id, button)}
        title={title}
        isEditing={panels.editingId === id}
        controls={formId}
        onToggle={() => panels.toggleEditing(id)}
      />

      <DeleteLinkButton
        ref={(button) => panels.rememberDeleteButton(id, button)}
        title={title}
        isAsking={panels.deletingId === id}
        controls={questionId}
        onToggle={() => panels.toggleDeleting(id)}
      />
    </div>
  );
}
