import { useId, useRef, useState, type Ref } from 'react';
import { DataIcon } from '@/src/components/icons';
import { PopoverButton } from '@/src/components/PopoverButton';
import { useTranslation } from '@/src/i18n/context';
import { DataDialog } from './DataDialog';

/**
 * The cog in the dashboard header, and the list of what it leads to.
 *
 * A menu rather than a shortcut into one dialog: the cog used to open the data
 * file straight away, which is a promise no cog makes — and the surfaces behind
 * it are about to be more than one. Naming each destination in words also
 * spares every one of them an icon of its own, since a picture in a header row
 * says nothing until it is hovered.
 *
 * Not "settings": language and appearance are the only settings there are, and
 * they stay outside as their own buttons because they are what gets reached for
 * most. What is in here are tasks that open a workspace.
 *
 * Entries carry no trailing ellipsis. The convention distinguishes an entry
 * that acts at once from one that asks first, and here there is nothing to
 * distinguish — every entry opens something.
 */
export function ManageMenu() {
  const { t } = useTranslation();
  const [isDataOpen, setIsDataOpen] = useState(false);
  const firstEntryRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  return (
    <>
      <PopoverButton
        label={t('manage.heading')}
        icon={<DataIcon />}
        initialFocusRef={firstEntryRef}
      >
        {(close) => (
          <>
            {/*
              A heading rather than the `legend` the two setting panels use:
              those are a set of choices in a fieldset, this is a list of
              places to go, and a heading is what a screen reader can jump to.
            */}
            <h2 id={headingId} className="mb-2 font-serif text-base font-semibold">
              {t('manage.heading')}
            </h2>

            <ul aria-labelledby={headingId} className="flex flex-col gap-1">
              <li>
                <MenuEntry
                  ref={firstEntryRef}
                  onClick={() => {
                    /*
                      In this order on purpose. Closing the panel hands focus
                      back to the cog first, and that is the element the browser
                      then remembers as it opens the dialog — so closing the
                      dialog again lands on the cog rather than on nothing,
                      the entry that was clicked having gone with the panel.
                    */
                    close();
                    setIsDataOpen(true);
                  }}
                >
                  {t('data.heading')}
                </MenuEntry>
              </li>
            </ul>
          </>
        )}
      </PopoverButton>

      <DataDialog isOpen={isDataOpen} onClose={() => setIsDataOpen(false)} />
    </>
  );
}

/**
 * One destination. The whole row is the target, well past the 24px minimum for
 * pointer targets (WCAG 2.2 AA, 2.5.8), and it says that a dialog is what
 * opens — the cog itself only reveals this panel and says so with
 * `aria-expanded`.
 */
function MenuEntry({
  onClick,
  children,
  ref,
}: {
  onClick: () => void;
  children: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="w-full rounded-field px-3 py-2 text-left text-sm hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}
