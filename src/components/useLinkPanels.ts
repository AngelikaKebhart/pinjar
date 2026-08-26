import { useCallback, useRef, useState, type RefObject } from 'react';
import type { SavedLink } from '@/src/lib/saved-link';

/**
 * Which saved link has its form open, which one is being asked about before
 * deletion, and where the focus goes afterwards.
 *
 * Popup and dashboard both show a list of links with the same two buttons on
 * each, and owe the keyboard the same things: hand focus back to the button
 * that opened a panel, and never drop it when a link is deleted out from under
 * it. Held once for the whole list rather than per row — a row that held its
 * own copy could not know what the row above it was showing, which is how the
 * popup ended up with two forms open at once.
 *
 * On one link the two are exclusive, so the highlighted button is always the
 * one whose panel is showing and a form never sits forgotten behind a
 * question. Across links they are not: dismissing a question on one link
 * leaves an open form on another alone, since the user never asked for it to
 * go and would not see it happen.
 *
 * Still two values rather than one "which panel is open" switch: with a single
 * value every close reached both, which made cancelling a question on one link
 * close the form on a different one.
 */
export interface LinkPanels {
  /** The link whose form is open, if any. Only ever one. */
  editingId: string | null;
  /** The link whose delete question is showing, if any. Only ever one. */
  deletingId: string | null;
  /** Opens this link's form, or closes it and hands focus back to its button. */
  toggleEditing: (id: string) => void;
  /** The same, for the delete question. */
  toggleDeleting: (id: string) => void;
  /** Called by each row with its edit button, so focus can be sent there. */
  rememberEditButton: (id: string, button: HTMLButtonElement | null) => void;
  /** Called by each row with its delete button, for the same reason. */
  rememberDeleteButton: (id: string, button: HTMLButtonElement | null) => void;
  /**
   * Puts the focus somewhere sensible once a link is gone: the next link's edit
   * button, the previous one if it was the last, the heading above the list if
   * nothing is left. Otherwise focus falls to the document and a keyboard user
   * starts again at the top of the page.
   *
   * `shown` is the list as displayed before the deletion — that is what says
   * who the neighbours were.
   */
  moveFocusAfterRemoving: (shown: SavedLink[], removedId: string) => void;
}

export function useLinkPanels(emptyListFocusRef: RefObject<HTMLElement | null>): LinkPanels {
  /*
   * A deleted link can leave its id behind in either of these. Harmless: an id
   * is only compared against links on screen, and no other link can carry it.
   */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editButtons, rememberEditButton] = useButtonRegistry();
  const [deleteButtons, rememberDeleteButton] = useButtonRegistry();

  /*
   * Focus can move straight away, without waiting for the panel to go: the
   * button never left — which is why it stays on screen while the panel shows.
   */
  const toggleEditing = useCallback(
    (id: string) => {
      const isClosing = editingId === id;

      setEditingId(isClosing ? null : id);

      if (isClosing) {
        editButtons.current.get(id)?.focus();
      } else {
        // This link's question makes way for the form. Written as an update
        // so it holds even if two presses land without a render between them.
        setDeletingId((current) => (current === id ? null : current));
      }
    },
    [editingId, editButtons],
  );

  const toggleDeleting = useCallback(
    (id: string) => {
      const isClosing = deletingId === id;

      setDeletingId(isClosing ? null : id);

      if (isClosing) {
        deleteButtons.current.get(id)?.focus();
      } else {
        // Only this link's form — one on another link is not in the way.
        setEditingId((current) => (current === id ? null : current));
      }
    },
    [deletingId, deleteButtons],
  );

  const moveFocusAfterRemoving = useCallback(
    (shown: SavedLink[], removedId: string) => {
      const position = shown.findIndex((link) => link.id === removedId);
      const neighbour = position === -1 ? undefined : (shown[position + 1] ?? shown[position - 1]);
      const button = neighbour === undefined ? undefined : editButtons.current.get(neighbour.id);

      (button ?? emptyListFocusRef.current)?.focus();
    },
    [emptyListFocusRef, editButtons],
  );

  return {
    editingId,
    deletingId,
    toggleEditing,
    toggleDeleting,
    rememberEditButton,
    rememberDeleteButton,
    moveFocusAfterRemoving,
  };
}

/** The buttons of one kind, by link id, so focus can be handed back to them. */
function useButtonRegistry() {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const remember = useCallback((id: string, button: HTMLButtonElement | null) => {
    if (button === null) {
      buttons.current.delete(id);
    } else {
      buttons.current.set(id, button);
    }
  }, []);

  return [buttons, remember] as const;
}
