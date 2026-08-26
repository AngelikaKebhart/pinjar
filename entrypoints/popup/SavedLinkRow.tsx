import { useId, useRef, useState, type Ref } from 'react';
import { DeletePanel } from '@/src/components/DeletePanel';
import { SavedLinkActions } from '@/src/components/SavedLinkActions';
import { SavedLinkForm } from '@/src/components/SavedLinkForm';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';

type ActivePanel = 'editing' | 'deleting' | null;

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
 * The form is long, the list is what the popup is for, and a form that opened
 * by itself would push the list out of sight for everyone who only wanted to
 * look.
 */
export function SavedLinkRow({
  link,
  isEditing,
  onEditingChange,
  onDelete,
  onEdit,
  editButtonRef,
}: {
  link: SavedLink;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onDelete: () => void | Promise<void>;
  onEdit: (edits: SavedLinkEdits) => void | Promise<void>;
  editButtonRef?: Ref<HTMLButtonElement>;
}) {
  const formId = useId();
  const [activePanel, setActivePanel] = useState<ActivePanel>(isEditing ? 'editing' : null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const setPanel = (panel: ActivePanel) => {
    setActivePanel(panel);
    if (panel === null) {
      onEditingChange(false);
      if (activePanel === 'deleting') {
        deleteButtonRef.current?.focus();
      }
    } else if (panel === 'editing') {
      onEditingChange(true);
    }
  };

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
          className="min-w-40 flex-1 break-words rounded-sm py-1 text-sm text-link underline hover:text-link-strong cursor-pointer"
        >
          {link.title}
        </a>

        <SavedLinkActions
          title={link.title}
          activePanel={activePanel}
          formId={formId}
          onToggleEdit={() => setPanel(activePanel === 'editing' ? null : 'editing')}
          onToggleDelete={() => setPanel(activePanel === 'deleting' ? null : 'deleting')}
          editButtonRef={editButtonRef}
          deleteButtonRef={deleteButtonRef}
        />
      </div>

      {activePanel === 'editing' ? (
        <SavedLinkForm
          id={formId}
          link={link}
          onSave={async (edits) => {
            await onEdit(edits);
            setPanel(null);
          }}
          onCancel={() => setPanel(null)}
          onDelete={() => setPanel('deleting')}
        />
      ) : activePanel === 'deleting' ? (
        <DeletePanel
          title={link.title}
          onConfirm={async () => {
            await onDelete();
          }}
          onCancel={() => setPanel(null)}
        />
      ) : null}
    </div>
  );
}

