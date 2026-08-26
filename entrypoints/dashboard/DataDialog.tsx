import { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from '@/src/components/IconButton';
import { CloseIcon, DataIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';
import { DataSection } from './DataSection';

/**
 * Export, import and delete-all, behind an icon button in the header.
 *
 * A native `<dialog>` opened with `showModal()`, so the browser keeps focus
 * inside, closes on Escape, inerts the page behind and hands focus back
 * afterwards — each a WCAG requirement (2.1.2, 2.4.3, 2.4.11) and each a
 * well-known way to get a hand-built modal wrong.
 *
 * Behind a button rather than in a section below the list: the three are rare,
 * and the page is for reading the list, not for growing a longer scroll between
 * the user and the last saved link.
 */
export function DataDialog() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  /*
   * `showModal()` rather than the `open` attribute: only the method puts the
   * dialog in the top layer with all the behaviour above. React therefore
   * cannot render this state, only ask for it.
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
        `onClose` covers the ways the browser closes it on its own — Escape above
        all — which React would otherwise never hear about, leaving the button
        unable to open it a second time.
      */}
      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        aria-labelledby={headingId}
        /*
          Adds a click on the backdrop to the ways out, which is what most people
          try first. Chrome 134 and Firefox 141; where it is not understood it is
          ignored and the close button and Escape still do the job.
        */
        // eslint-disable-next-line react/no-unknown-property -- newer than the plugin's list of attributes
        closedby="any"
        /*
          The one place that takes no palette colour: dimming means darker in
          both palettes, and a token would make this a pale wash over the dark
          interface — fog rather than "this is switched off".
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
          Mounted only while open, so it reads storage when asked rather than
          watching it for the whole life of the tab.
        */}
        {isOpen && <DataSection />}
      </dialog>
    </>
  );
}
