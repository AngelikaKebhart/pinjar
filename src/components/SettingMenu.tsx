import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '@/src/components/IconButton';

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
 * group means. The panel is a disclosure, so `aria-expanded` on the button
 * says whether it is open.
 *
 * Picking an option applies it at once and leaves the panel open. Closing on
 * a click would be the menu-like thing to do, but the same click also arrives
 * when the choice is made with the arrow keys, and a panel that shut itself
 * on the first arrow press could not be walked through at all. Staying open
 * also shows the change happening — the language menu relabels itself under
 * the pointer.
 *
 * Escape, a click outside, moving focus away, or the button itself all close
 * it. Escape and the button hand focus back, since that is where the user was.
 */
export function SettingMenu<Value extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: ReactNode;
  /** Names the button and heads the panel: "Interface language". */
  label: string;
  options: readonly SettingOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const groupName = useId();

  const closeAndReturnFocus = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  /*
   * The two ways out that do not go through a control of this component:
   * Escape, and a press somewhere else on the page.
   *
   * Both are listened for on the document rather than on the panel. Escape has
   * to work wherever the focus happens to be, and the press is taken on the way
   * down so that a control outside does not have to fight the panel for the
   * same gesture.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAndReturnFocus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  /*
   * Opening moves focus onto the chosen option, which is both what a keyboard
   * user expects to land on and what makes the arrow keys work immediately.
   */
  useEffect(() => {
    if (isOpen) {
      wrapperRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    }
  }, [isOpen]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        // Tabbing past the last option leaves the panel behind; without this it
        // would stay open over content the user has already moved on from.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <IconButton
        ref={buttonRef}
        label={label}
        expanded={isOpen}
        controls={panelId}
        onClick={() => (isOpen ? closeAndReturnFocus() : setIsOpen(true))}
      >
        {icon}
      </IconButton>

      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 z-10 mt-1 w-max max-w-72 rounded-md border border-line-strong bg-surface p-3 shadow-lg"
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">{label}</legend>

            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover"
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option.value}
                  checked={option.value === value}
                  onChange={() => onChange(option.value)}
                  className="accent-accent"
                />
                <span lang={option.lang}>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
