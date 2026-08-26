import { useId } from 'react';
import { DeletePanel } from '@/src/components/DeletePanel';
import { SavedLinkActions } from '@/src/components/SavedLinkActions';
import { SavedLinkForm } from '@/src/components/SavedLinkForm';
import type { LinkPanels } from '@/src/components/useLinkPanels';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';

/**
 * One saved link in the popup's list, with its form folded away behind a
 * button (docs/concept.md §3.1 and §3.4).
 *
 * The dashboard's card is built the same way and for the same reason: a line
 * that names the link and carries its two buttons, and underneath it either
 * the link's details or the form. The line stays put while the form is open,
 * so the way out is exactly where the way in was, and the user can still see
 * which link they are editing.
 *
 * Which panels are open is kept in `panels`, one answer for the whole list and
 * the same one the dashboard uses. Per-row state let the popup open a second
 * form without closing the first.
 *
 * The form is long, the list is what the popup is for, and a form that opened
 * by itself would push the list out of sight for everyone who only wanted to
 * look.
 */
export function SavedLinkRow({
  link,
  panels,
  onDelete,
  onEdit,
}: {
  link: SavedLink;
  panels: LinkPanels;
  onDelete: () => void | Promise<void>;
  onEdit: (edits: SavedLinkEdits) => void | Promise<void>;
}) {
  const formId = useId();
  const questionId = useId();

  const isEditing = panels.editingId === link.id;
  const isAsking = panels.deletingId === link.id;

  return (
    <div className="flex flex-col gap-2">
      {/*
        Title and its two buttons on one line. As icons they cost 88px of the
        popup's width instead of the two words they replace, which is what
        leaves the title enough of the line to still be read (WCAG 2.2 AA,
        1.4.10) — German buttons included, since a pencil is the same width in
        any language.

        The floor under the title is what keeps that true when the delete
        button opens its question in words: rather than squeezing the title
        into a column three characters wide, the buttons move to a line of
        their own.
      */}
      <div className="flex flex-wrap items-start gap-2">
        {/*
          A real link, so it keeps its semantics and middle-click. The popup
          would otherwise navigate itself; target opens a tab. noreferrer keeps
          the extension's address off the target site.
        */}
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-40 flex-1 break-words rounded-sm py-1 text-sm text-link underline hover:text-link-strong"
        >
          {link.title}
        </a>

        <SavedLinkActions
          id={link.id}
          title={link.title}
          panels={panels}
          formId={formId}
          questionId={questionId}
        />
      </div>

      {isEditing && (
        <SavedLinkForm
          id={formId}
          link={link}
          onSave={async (edits) => {
            await onEdit(edits);
            panels.toggleEditing(link.id);
          }}
          onCancel={() => panels.toggleEditing(link.id)}
        />
      )}

      {/*
        Below the form rather than instead of it: answering "no" to the
        question must not take away what the user has typed above it.
      */}
      {isAsking && (
        <DeletePanel
          id={questionId}
          title={link.title}
          onConfirm={onDelete}
          onCancel={() => panels.toggleDeleting(link.id)}
        />
      )}
    </div>
  );
}
