import { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { CloseIcon, DataIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';
import { DataSection } from './DataSection';

/**
 * Export, import and delete-all, behind an icon button in the header.
 *
 * A native `<dialog>` opened with `showModal()`, so the browser itself keeps
 * focus inside, closes on Escape, inerts the page behind it and hands focus
 * back to the button afterwards. Every one of those is a WCAG requirement
 * (2.1.2, 2.4.3, 2.4.11) and every one of them is a well-known way to get a
 * hand-built modal wrong.
 *
 * These three actions used to sit at the bottom of the dashboard, below the
 * list. They are rare and they are not what the page is for — reading the
 * list is — so they moved out of the way rather than growing a longer scroll
 * between the user and the last saved link.
 */
export function DataDialog() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  /*
   * `showModal()` rather than the `open` attribute: only the method puts the
   * dialog in the top layer and turns on all of the behaviour above. React
   * therefore cannot render the state, it can only ask for it.
   */
  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <>
      <IconButton label={t('data.heading')} hasPopup="dialog" onClick={() => setIsOpen(true)}>
        <DataIcon />
      </IconButton>

      {/*
        `onClose` covers the ways the browser closes it on its own — Escape
        above all — which React would otherwise never hear about, leaving the
        button unable to open it a second time.
      */}
      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        aria-labelledby={headingId}
        /*
          Adds a click on the backdrop to the ways out, which is what most
          people try first. Firefox learned this attribute in 141 and Chrome in
          134; where it is not understood it is ignored, and the close button
          and Escape still do the job — so nothing is lost on an older browser
          and nothing has to be rebuilt by hand on a current one.
        */
        // eslint-disable-next-line react/no-unknown-property -- newer than the plugin's list of attributes
        closedby="any"
        /*
          The backdrop is the one place that does not take a palette color. It
          dims what is behind it, and dimming means darker in both palettes —
          a token would turn it into a pale wash over the dark interface, which
          reads as fog rather than as "this is switched off".
        */
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-6 text-ink shadow-card backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={headingId} className="text-lg font-medium">
            {t('data.heading')}
          </h2>

          <IconButton label={t('data.close')} onClick={() => setIsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>

        {/*
          Mounted only while the dialog is open, so it reads what is stored at
          the moment it is asked for rather than watching storage for the whole
          life of the tab.
        */}
        {isOpen && <DataSection />}
      </dialog>
    </>
  );
}
