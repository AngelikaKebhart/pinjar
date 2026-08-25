import { useId, useRef, type ReactNode } from 'react';
import { PopoverButton } from '@/src/components/PopoverButton';

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
 * The choices are radio buttons in a `<fieldset>`, not a `role="menu"`. Both
 * are legitimate, and this one is native: the browser gives the group its
 * arrow-key navigation, its "one of these" announcement and its checked state
 * for free, where a menu would have all three written by hand — and each of
 * these settings really is one answer out of three, which is what a radio
 * group means.
 *
 * Picking an option applies it at once and leaves the panel open. Closing on
 * a click would be the menu-like thing to do, but the same click also arrives
 * when the choice is made with the arrow keys, and a panel that shut itself
 * on the first arrow press could not be walked through at all. Staying open
 * also shows the change happening — the language menu relabels itself under
 * the pointer.
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

  return (
    <PopoverButton label={label} icon={icon} initialFocusRef={chosenRef}>
      {() => (
        <fieldset className="flex flex-col gap-1">
          {/*
            The panel repeats the name of the setting, because the button that
            opened it carries that name only as a label a sighted user never
            sees. Serif, like every other heading in the interface.
          */}
          <legend className="mb-2 font-serif text-base font-semibold">{label}</legend>

          {options.map((option) => (
            // The whole row is the label, so the words answer to a click just
            // as the dot beside them does — the dot on its own is a 13px
            // target, well under the 24px minimum (WCAG 2.2 AA, 2.5.8).
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-field px-3 py-2 text-sm hover:bg-surface-hover"
            >
              <input
                ref={option.value === value ? chosenRef : undefined}
                type="radio"
                name={groupName}
                value={option.value}
                checked={option.value === value}
                onChange={() => onChange(option.value)}
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
