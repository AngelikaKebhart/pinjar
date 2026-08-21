import { useRef, useState } from 'react';
import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { EditLinkButton } from '@/src/components/EditLinkButton';
import { SavedLinkForm } from '@/src/components/SavedLinkForm';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';

/**
 * One saved link in the popup's list, with its form folded away behind a
 * button (docs/concept.md §3.1 and §3.4).
 *
 * The dashboard's card works the same way and for the same reason: the form
 * is long, the list is what the popup is for, and a form that opens by itself
 * would push the list out of sight for everyone who only wanted to look.
 *
 * Each row keeps its own open state rather than the popup keeping one for all
 * of them. That is what makes closing able to hand focus back to the button
 * that opened it — the row knows which button that was, a shared state would
 * not.
 */
export function SavedLinkRow({
  link,
  onDelete,
  onEdit,
}: {
  link: SavedLink;
  onDelete: () => void | Promise<void>;
  onEdit: (edits: SavedLinkEdits) => void | Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Closing the form hands focus back to the button that opened it. Without
   * this, focus falls to the document and a keyboard user starts over at the
   * top of the popup.
   */
  const closeForm = () => {
    setIsEditing(false);
    // The button only exists again after the form is gone.
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  if (isEditing) {
    return (
      <SavedLinkForm
        link={link}
        onSave={async (edits) => {
          await onEdit(edits);
          closeForm();
        }}
        onCancel={closeForm}
      />
    );
  }

  /*
   * The title has the row to itself and the buttons sit underneath. Beside
   * them it would be left with about a third of the popup's 320px — in German
   * more so, where both buttons are longer words — and a title is what tells
   * two saved links apart (WCAG 2.2 AA, 1.4.10).
   */
  return (
    <div className="flex flex-col gap-1">
      {/*
        A real link, so it keeps its semantics and middle-click. The popup
        would otherwise navigate itself; target opens a tab. noreferrer keeps
        the extension's address off the target site.
      */}
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="break-words rounded-sm py-1 text-sm text-link underline hover:text-link-strong"
      >
        {link.title}
      </a>

      <div className="flex flex-wrap gap-2">
        <EditLinkButton ref={editButtonRef} title={link.title} onEdit={() => setIsEditing(true)} />

        <DeleteLinkButton title={link.title} onDelete={onDelete} />
      </div>
    </div>
  );
}
