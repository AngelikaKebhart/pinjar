import { useId, useRef, useState, type Ref } from 'react';
import { DataIcon } from '@/src/components/icons';
import { POPOVER_HEADING, POPOVER_ROW, PopoverButton } from '@/src/components/PopoverButton';
import { useTranslation } from '@/src/i18n/context';
import type { OrganizationKind } from '@/src/lib/organization';
import { ContactDialog } from './ContactDialog';
import { DataDialog } from './DataDialog';
import { OrganizationDialog } from './OrganizationDialog';

/** What the menu can have open. `null` is the menu itself doing nothing. */
type Destination = OrganizationKind | 'data' | 'contact';

/** The three lists of values, in the order a saved link shows them. */
const ORGANIZATION_ENTRIES: OrganizationKind[] = ['category', 'status', 'tag'];

/**
 * The cog in the dashboard header, and the list of what it leads to.
 *
 * A menu rather than a shortcut into one dialog: the cog used to open the data
 * file straight away, which is a promise no cog makes — and the surfaces behind
 * it are more than one. Naming each destination in words also spares every one
 * of them an icon of its own, since a picture in a header row says nothing
 * until it is hovered.
 *
 * Not "settings": language and appearance are the only settings there are, and
 * they stay outside as their own buttons because they are what gets reached for
 * most. What is in here are tasks that open a workspace.
 *
 * The three lists of values come first, kept apart from the rest by a rule, in
 * the order a saved link shows them — the same three words in the same sequence as on a card, so
 * that whichever surface the user came from, the entry is where they left it.
 * They are what gets tidied every so often; export, import and delete-all are
 * rare, and the last of them is the one entry nobody should reach for by
 * mistake.
 *
 * Entries carry no trailing ellipsis. The convention distinguishes an entry
 * that acts at once from one that asks first, and here there is nothing to
 * distinguish — every entry opens something.
 */
export function ManageMenu() {
  const { t } = useTranslation();
  const [openDestination, setOpenDestination] = useState<Destination | null>(null);
  const firstEntryRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  /*
   * In this order on purpose. Closing the panel hands focus back to the cog
   * first, and that is the element the browser then remembers as it opens the
   * dialog — so closing the dialog again lands on the cog rather than on
   * nothing, the entry that was clicked having gone with the panel.
   */
  const go = (close: () => void, destination: Destination) => {
    close();
    setOpenDestination(destination);
  };

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
            <h2 id={headingId} className={POPOVER_HEADING}>
              {t('manage.heading')}
            </h2>

            {/* No gap: the rows sit flush, see `POPOVER_ROW`. */}
            <ul aria-labelledby={headingId} className="flex flex-col">
              {ORGANIZATION_ENTRIES.map((kind, position) => (
                <li key={kind}>
                  <MenuEntry
                    ref={position === 0 ? firstEntryRef : undefined}
                    onClick={() => go(close, kind)}
                  >
                    {t(`organization.${kind}.heading`)}
                  </MenuEntry>
                </li>
              ))}

              {/*
                One rule, between the lists of values and everything else. At
                five entries the panel had become a wall of equally weighted
                words; the line says which three belong together without any of
                them needing a group name.

                An `hr` rather than a border on the row below it: HTML allows
                one between the items of a list, and it is the only element a
                screen reader reads back as a separator — a border would draw
                the grouping for sighted readers alone (WCAG 2.2 AA, 1.3.1).

                One rule and not two: 3 + 2 reads as two groups, 3 + 1 + 1 as a
                list that has been cut up.
              */}
              <hr className="my-2 border-line" />

              <li>
                <MenuEntry onClick={() => go(close, 'data')}>{t('data.heading')}</MenuEntry>
              </li>

              {/*
                Last, because it is the only entry that leads out of the
                extension rather than into a part of it.
              */}
              <li>
                <MenuEntry onClick={() => go(close, 'contact')}>{t('contact.heading')}</MenuEntry>
              </li>
            </ul>
          </>
        )}
      </PopoverButton>

      {/*
        Every dialog is rendered, open or not: each keeps its contents unmounted
        while closed, and a dialog that appeared only once it was wanted would
        have nothing to hand focus back to when it went again.
      */}
      {ORGANIZATION_ENTRIES.map((kind) => (
        <OrganizationDialog
          key={kind}
          kind={kind}
          isOpen={openDestination === kind}
          onClose={() => setOpenDestination(null)}
        />
      ))}

      <DataDialog isOpen={openDestination === 'data'} onClose={() => setOpenDestination(null)} />

      <ContactDialog
        isOpen={openDestination === 'contact'}
        onClose={() => setOpenDestination(null)}
      />
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
      className={`w-full text-left ${POPOVER_ROW}`}
    >
      {children}
    </button>
  );
}
