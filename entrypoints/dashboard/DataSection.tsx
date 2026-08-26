import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '@/src/i18n/context';
import {
  deleteAllSavedData,
  getStoredDataPresence,
  watchStoredData,
  type StoredDataPresence,
} from '@/src/lib/storage';
import {
  buildExportFile,
  exportFileName,
  importFile,
  type ImportOutcome,
} from '@/src/lib/transfer';

/**
 * Carrying the wishlist out as a file, reading one back in, and throwing
 * everything away (docs/concept.md §3.6 and §7.3).
 *
 * The three belong together and in this order: the file is the only way the
 * wishlist reaches another browser, and it is also the only backup there is.
 * Putting the export above the deletion means the way to keep a copy is
 * already on screen when someone reaches for the irreversible button.
 */
export function DataSection() {
  const { t } = useTranslation();

  /*
   * What happened, not the sentence about it. A message kept as finished text
   * stays in the language it was made in, and would still be sitting there in
   * German after the user switched the dashboard to English (§3.7).
   */
  const [notice, setNotice] = useState<Notice | null>(null);
  const [stored, setStored] = useState<StoredDataPresence | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  /*
   * Watched rather than read once: importing adds, deleting clears, and the
   * popup can save something while this tab stays open. Either button would
   * otherwise sit there claiming a state that has passed.
   */
  useEffect(() => {
    const refresh = () => void getStoredDataPresence().then(setStored);

    refresh();

    return watchStoredData(refresh);
  }, []);

  const handleExport = async () => {
    const file = await buildExportFile();

    downloadJson(JSON.stringify(file, null, 2), exportFileName());
    setNotice({ kind: 'exported' });
  };

  const handleImport = async (file: File) => {
    setNotice({ kind: 'imported', outcome: await importFile(await file.text()) });

    // Without this, picking the same file twice in a row fires no second
    // change event and nothing would appear to happen.
    if (pickerRef.current !== null) {
      pickerRef.current.value = '';
    }
  };

  // Nothing here can be answered before it is known what is stored, and a
  // button that flips from idle to available is worse than one that waits.
  if (stored === null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t('data.export.heading')}</h3>

        {/*
          With nothing saved, the warning about notes in the file describes a
          file that would hold none — so the empty case says what is actually
          the matter, and doubles as the reason the button cannot be pressed.
        */}
        <p className="text-sm text-ink-muted">
          {stored.hasLinks ? t('data.export.hint') : t('data.export.nothingYet')}
        </p>

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={!stored.hasLinks}
          className={PRIMARY_BUTTON}
        >
          {t('data.export.action')}
        </button>

        <NoticeSlot notice={notice} shownFor="exported" />
      </section>

      <Divider />

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t('data.import.heading')}</h3>
        <p className="text-sm text-ink-muted">{t('data.import.hint')}</p>

        {/*
          Never disabled, not even with an empty wishlist: an empty one is
          exactly when a file is most likely to be waiting.
        */}
        <button type="button" onClick={() => pickerRef.current?.click()} className={PRIMARY_BUTTON}>
          {t('data.import.action')}
        </button>

        {/*
          The picker itself stays out of sight, opened by the button above.
          Its own labels come from the browser rather than from our catalogs —
          it would offer "Datei auswählen" in a dashboard switched to English
          (§3.7) — and Tailwind's reset strips the button chrome off it, so on
          screen it reads as plain text rather than as something to press.
        */}
        <input
          ref={pickerRef}
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const [file] = event.target.files ?? [];
            if (file !== undefined) {
              void handleImport(file);
            }
          }}
          className="hidden"
        />

        <NoticeSlot notice={notice} shownFor="imported" />
      </section>

      <Divider />

      <DeleteEverything
        hasAnythingToDelete={stored.hasAnything}
        notice={notice}
        onDeleted={() => setNotice({ kind: 'deleted' })}
      />
    </div>
  );
}

/**
 * Export and import are filled, deleting everything is not.
 *
 * The two that hand data around are what this dialog is for, and they are
 * safe. The third is the one action in the extension that cannot be taken
 * back, so it is left as an outline: it has to be findable, it must not be
 * the thing the eye lands on first. Color cannot make that difference here —
 * the whole palette is red — so weight does (WCAG 2.2 AA, 1.4.1).
 */
const PRIMARY_BUTTON =
  'w-fit rounded-control bg-accent px-4 py-2 text-sm font-bold text-on-accent enabled:hover:bg-accent-strong disabled:bg-disabled disabled:text-on-disabled cursor-pointer';

const OUTLINE_BUTTON =
  'w-fit rounded-control border border-line-strong px-4 py-2 text-sm font-bold text-link enabled:hover:bg-surface-hover disabled:border-line disabled:text-ink-muted cursor-pointer';

/** Separates the three actions without giving any of them a box of its own. */
function Divider() {
  return <hr className="border-line" />;
}

/** What just happened, kept until the next thing does. */
type Notice =
  { kind: 'exported' } | { kind: 'imported'; outcome: ImportOutcome } | { kind: 'deleted' };

/**
 * The place a message appears: directly below the button that caused it.
 *
 * The region itself is always in the document, even while it has nothing to
 * say. A live region that appears together with its text is announced
 * unreliably, and this is the only feedback the extension gives — where a
 * file goes and comes from afterwards is the browser's own business.
 */
function NoticeSlot({ notice, shownFor }: { notice: Notice | null; shownFor: Notice['kind'] }) {
  return (
    <div aria-live="polite">{notice?.kind === shownFor && <NoticePanel notice={notice} />}</div>
  );
}

/**
 * The sentence for a notice, built in the language that is active right now.
 *
 * Marked by a glyph as well as by the color of its border, so that how it
 * went is never carried by color alone (WCAG 2.2 AA, 1.4.1).
 */
function NoticePanel({ notice }: { notice: Notice }) {
  const { t, plural } = useTranslation();
  const { text, wentWrong } = describeNotice(notice, t, plural);

  return (
    <p
      className={
        'mt-1 flex w-fit items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm font-medium ' +
        (wentWrong ? 'border-danger' : 'border-accent')
      }
    >
      <span aria-hidden="true">{wentWrong ? '!' : '✓'}</span>
      {text}
    </p>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];
type Pluralize = ReturnType<typeof useTranslation>['plural'];

function describeNotice(
  notice: Notice,
  t: Translate,
  plural: Pluralize,
): { text: string; wentWrong: boolean } {
  if (notice.kind === 'exported') {
    return { text: t('data.export.done'), wentWrong: false };
  }

  if (notice.kind === 'deleted') {
    return { text: t('data.deleteAll.done'), wentWrong: false };
  }

  const { outcome } = notice;
  if (outcome.status === 'failed') {
    return { text: t(`data.import.error.${outcome.problem}`), wentWrong: true };
  }

  // One sentence per thing that happened, and only for the things that did.
  const parts = [plural('data.import.added', outcome.added)];
  if (outcome.duplicates > 0) {
    parts.push(plural('data.import.duplicates', outcome.duplicates));
  }
  if (outcome.unusable > 0) {
    parts.push(plural('data.import.unusable', outcome.unusable));
  }

  // Entries that could not be read are not a failed import, but the user is
  // left with less than the file promised and should see that at a glance.
  return { text: parts.join(' '), wentWrong: outcome.unusable > 0 };
}

/**
 * Deleting everything, behind a question.
 *
 * The warning only appears once the button is pressed, so it is read at the
 * moment it matters rather than sitting there being ignored. It says what
 * goes and that nothing brings it back (WCAG 2.2 AA, 3.3.4).
 *
 * "Nothing to delete" means nothing at all is stored, not merely an empty
 * list: categories, tags and status values outlive the links that used them,
 * and clearing those is part of the same right (§7.3).
 */
function DeleteEverything({
  hasAnythingToDelete,
  notice,
  onDeleted,
}: {
  hasAnythingToDelete: boolean;
  notice: Notice | null;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const wasAsking = useRef(false);
  const warningId = useId();

  /*
   * The button that was pressed is replaced by the question, so focus has to
   * be handed over: it would otherwise fall back to the document, leaving a
   * keyboard user to tab in from the top of the page again. The question
   * carries the warning as its accessible name, so moving focus there is also
   * what reads the warning out before it can be answered — without it, the
   * one safeguard against an irreversible deletion is silent (WCAG 2.2 AA,
   * 4.1.3). Answering hands focus back, except after a deletion, which leaves
   * the button disabled and therefore unfocusable; what happened is announced
   * by the notice instead.
   */
  useEffect(() => {
    if (isAsking) {
      questionRef.current?.focus();
    } else if (wasAsking.current) {
      triggerRef.current?.focus();
    }

    wasAsking.current = isAsking;
  }, [isAsking]);

  if (!isAsking) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t('data.deleteAll.heading')}</h3>
        <p className="text-sm text-ink-muted">{t('data.deleteAll.hint')}</p>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsAsking(true)}
          disabled={!hasAnythingToDelete}
          className={OUTLINE_BUTTON}
        >
          {t('data.deleteAll.action')}
        </button>

        <NoticeSlot notice={notice} shownFor="deleted" />
      </section>
    );
  }

  return (
    <div
      ref={questionRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={warningId}
      className="flex flex-col gap-3 rounded-card border border-danger p-4"
    >
      <p id={warningId} className="text-sm">
        {t('data.deleteAll.warning')}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void deleteAllSavedData().then(() => {
              setIsAsking(false);
              onDeleted();
            });
          }}
          className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-on-danger hover:bg-danger-strong"
        >
          {t('data.deleteAll.confirm')}
        </button>

        <button
          type="button"
          onClick={() => setIsAsking(false)}
          className="rounded-control border border-line-strong px-4 py-2 text-sm font-bold hover:bg-surface-hover"
        >
          {t('data.deleteAll.cancel')}
        </button>
      </div>
    </div>
  );
}

/**
 * Hands the file to the browser's own download.
 *
 * A blob and a link click rather than the `downloads` permission: the file is
 * built here and never leaves the device, so a permission to save it would
 * buy nothing and cost the user a warning (docs/concept.md §7.4).
 */
function downloadJson(contents: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  // Part of the document while it is clicked, and released only a turn later.
  // Both are for Firefox, which ignores a click on a link that is not in the
  // page, and cancels a download whose blob URL is revoked in the same turn
  // that started it.
  document.body.append(link);
  link.click();
  link.remove();

  // The blob occupies memory for as long as its URL exists.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/** Long enough for the download to have taken the blob, short enough to not hold it. */
const REVOKE_DELAY_MS = 1000;
