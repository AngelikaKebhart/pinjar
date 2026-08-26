import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { EditLinkButton } from '@/src/components/EditLinkButton';
import type { LinkPanels } from '@/src/components/useLinkPanels';

/**
 * The two things that can be done to a saved link, as one group — so popup and
 * dashboard cannot offer them in different orders, sizes or behaviour.
 *
 * Both surfaces put it on the line carrying the link's title, and it stays
 * there while whatever it opened sits below: the way out is never further away
 * than the way in, and deleting a link just looked at needs no closing first.
 *
 * Both buttons are disclosures with the same contract, being the same
 * component: press to open, press again to close, Escape closes, focus comes
 * back either way. It takes the whole `panels` object rather than loose
 * booleans and callbacks, so "what is open" is answered once for the list.
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
