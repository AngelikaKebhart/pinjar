import { useCallback, useRef } from 'react';

/**
 * The buttons of one kind, by key, so focus can be handed back to them once the
 * panel they opened is gone.
 *
 * A ref rather than state: nothing is drawn from it, and a button arriving or
 * leaving is not a reason to render again.
 */
export function useButtonRegistry() {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const remember = useCallback((key: string, button: HTMLButtonElement | null) => {
    if (button === null) {
      buttons.current.delete(key);
    } else {
      buttons.current.set(key, button);
    }
  }, []);

  return [buttons, remember] as const;
}
