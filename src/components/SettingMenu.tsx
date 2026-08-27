import { useId, useRef, type ReactNode } from 'react';
import {
  POPOVER_HEADING,
  POPOVER_ROW,
  PopoverButton,
} from '@/src/components/PopoverButton';

/** One answer the setting can take. */
export type SettingOption<Value extends string> = {
  value: Value;
  /** Already translated, or — for a language name — deliberately not. */
  label: string;
  /** Set when the label is written in another language than the page (WCAG 3.1.2). */
  lang?: string;
};

/**
 * An icon button in the header that opens a small panel of choices.
 *
 * Radio buttons in a `<fieldset>`, not a `role="menu"`: each of these settings
 * is one answer out of three, which is what a radio group means, and the
 * browser then gives arrow-key navigation, the "one of these" announcement and
 * the checked state for free where a menu would need all three by hand.
 *
 * Picking an option applies it at once. Whether the panel then closes depends
 * on how the pick was made, because the two ways of making it mean different
 * things: a click is a finished decision, while the arrow keys select every
 * option they pass over on the way to the wanted one — a panel that shut on the
 * first arrow press could not be walked through at all.
 *
 * So the pointer closes it and the keyboard does not. Whoever used the keyboard
 * leaves by the ways `PopoverButton` already offers: Escape, Tab, the button.
 */
export function SettingMenu<Value extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: ReactNode;
  /** Names the button, and heads the panel: "Interface language". */
  label: string;
  options: readonly SettingOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const groupName = useId();
  const chosenRef = useRef<HTMLInputElement>(null);

  /*
   * How the pick being made was started. A press sets it, a key press clears it
   * again, and the change handler reads it — `change` itself does not say where
   * it came from, and the click a label forwards to its radio looks like a
   * keyboard one, so neither event can be asked directly.
   *
   * A ref rather than state: nothing on screen depends on it, and it has to be
   * true for the change that follows the very press that set it.
   */
  const pickedByPointer = useRef(false);

  return (
    <PopoverButton label={label} icon={icon} initialFocusRef={chosenRef}>
      {/* No gap: the rows sit flush, see `POPOVER_ROW`. */}
      {(close) => (
        <fieldset className="flex flex-col">
          {/*
            The panel repeats the setting's name, which the button carries only
            as a label a sighted user never sees. Serif, like every heading.
          */}
          <legend className={POPOVER_HEADING}>{label}</legend>

          {options.map((option) => (
            // The whole row is the label, so the words answer to a click as
            // the dot does — on its own the dot is a 13px target, well under
            // the 24px minimum (WCAG 2.2 AA, 2.5.8).
            <label
              key={option.value}
              className={`flex items-center gap-3 ${POPOVER_ROW}`}
              onPointerDown={() => {
                pickedByPointer.current = true;
              }}
            >
              <input
                ref={option.value === value ? chosenRef : undefined}
                type="radio"
                name={groupName}
                value={option.value}
                checked={option.value === value}
                // The arrow key lands on the option being left, before it moves
                // the selection on — early enough to clear the flag for the
                // change that follows.
                onKeyDown={() => {
                  pickedByPointer.current = false;
                }}
                onChange={() => {
                  onChange(option.value);

                  // Safe here and nowhere earlier: by the time `change` fires
                  // the radio is already checked, so taking the panel out from
                  // under the pointer cannot lose the pick. Closing on the
                  // label's own click would — the label passes the click to its
                  // radio only once that click is done propagating.
                  if (pickedByPointer.current) {
                    close();
                  }
                }}
                className="size-4"
              />
              <span lang={option.lang}>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}
    </PopoverButton>
  );
}
