import { useCallback, useRef, useState, type RefObject } from 'react';
import type { SavedLink } from '@/src/lib/saved-link';

/**
 * Which saved link has its form open, and where the focus goes afterwards.
 *
 * The popup and the dashboard both show a list of links with the same two
 * buttons on each, and both owe the keyboard the same things: hand focus back
 * to the button that opened a form, and never drop it on the floor when a link
 * is deleted out from under it. Keeping that here is what stops the two from
 * answering the question differently.
 *
 * One form at a time, and the list owns which one. Per-row state let the
 * dashboard end up with a screenful of open forms and no way to tell where one
 * ended and the next began; from up here, opening one closes the last.
 */
export interface LinkEditing {
  /** The link whose form is open, if any. */
  editingId: string | null;
  /** Opens this link's form, or closes it and hands focus back to its button. */
  setEditing: (id: string, isEditing: boolean) => void;
  /** Called by each row with its edit button, so focus can be sent there. */
  rememberEditButton: (id: string, button: HTMLButtonElement | null) => void;
  /**
   * Puts the focus somewhere sensible once a link is gone: the next link's
   * edit button, the previous one if it was the last in the list, and the
   * heading above the list if nothing is left. Without this the focus falls to
   * the document and a keyboard user starts again at the top of the page.
   *
   * `shown` is the list as it was displayed, before the deletion — that is
   * what says who the neighbours were.
   */
  moveFocusAfterRemoving: (shown: SavedLink[], removedId: string) => void;
}

export function useLinkEditing(emptyListFocusRef: RefObject<HTMLElement | null>): LinkEditing {
  /*
   * A deleted link can leave its id behind here. That is harmless: the id is
   * only ever compared against links that are on screen, and no other link can
   * ever carry it.
   */
  const [editingId, setEditingId] = useState<string | null>(null);

  const editButtons = useRef(new Map<string, HTMLButtonElement>());

  const rememberEditButton = useCallback((id: string, button: HTMLButtonElement | null) => {
    if (button === null) {
      editButtons.current.delete(id);
    } else {
      editButtons.current.set(id, button);
    }
  }, []);

  const setEditing = useCallback((id: string, isEditing: boolean) => {
    setEditingId(isEditing ? id : null);

    /*
     * Focus can move straight away, without waiting for the form to go: the
     * button never left. That is the whole reason it stays on screen while its
     * form is open.
     */
    if (!isEditing) {
      editButtons.current.get(id)?.focus();
    }
  }, []);

  const moveFocusAfterRemoving = useCallback(
    (shown: SavedLink[], removedId: string) => {
      const position = shown.findIndex((link) => link.id === removedId);
      const neighbour = position === -1 ? undefined : (shown[position + 1] ?? shown[position - 1]);
      const button = neighbour === undefined ? undefined : editButtons.current.get(neighbour.id);

      (button ?? emptyListFocusRef.current)?.focus();
    },
    [emptyListFocusRef],
  );

  return { editingId, setEditing, rememberEditButton, moveFocusAfterRemoving };
}
