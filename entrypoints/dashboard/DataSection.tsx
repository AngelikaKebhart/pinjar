import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/src/components/Button';
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
 * In this order on purpose: the file is the only backup there is, so the way to
 * keep a copy is already on screen when someone reaches for the irreversible
 * button.
 */
export function DataSection() {
  const { t } = useTranslation();

  /*
   * What happened, not the sentence about it: a message kept as finished text
   * would still sit there in German after a switch to English (§3.7).
   */
  const [notice, setNotice] = useState<Notice | null>(null);
  const [stored, setStored] = useState<StoredDataPresence | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  /*
   * Watched rather than read once: importing adds, deleting clears, and the
   * popup can save while this tab stays open — either button would otherwise
   * claim a state that has passed.
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

    // Without this, picking the same file twice fires no second change event.
    if (pickerRef.current !== null) {
      pickerRef.current.value = '';
    }
  };

  // Nothing here can be answered before it is known what is stored, and a
  // button flipping from idle to available is worse than one that waits.
  if (stored === null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t('data.export.heading')}</h3>

        {/*
          With nothing saved, the warning about notes in the file would describe
          a file holding none — so the empty case says what is actually the
          matter, and doubles as the reason the button cannot be pressed.
        */}
        <p className="text-sm text-ink-muted">
          {stored.hasLinks ? t('data.export.hint') : t('data.export.nothingYet')}
        </p>

        <Button
          type="button"
          variant="primary"
          onClick={() => void handleExport()}
          disabled={!stored.hasLinks}
          className="w-fit"
        >
          {t('data.export.action')}
        </Button>

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
        <Button
          type="button"
          variant="primary"
          onClick={() => pickerRef.current?.click()}
          className="w-fit"
        >
          {t('data.import.action')}
        </Button>

        {/*
          Out of sight, opened by the button above: its own labels come from the
          browser, not our catalogs — "Datei auswählen" in a dashboard switched
          to English (§3.7) — and Tailwind's reset strips its button chrome, so
          it would read as plain text rather than something to press.
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
 * The region stays in the document even while it has nothing to say, because a
 * live region that appears together with its text is announced unreliably — and
 * this is the only feedback the extension gives.
 */
function NoticeSlot({ notice, shownFor }: { notice: Notice | null; shownFor: Notice['kind'] }) {
  return (
    <div aria-live="polite">{notice?.kind === shownFor && <NoticePanel notice={notice} />}</div>
  );
}

/**
 * The sentence for a notice, built in the language active right now. Marked by
 * a glyph as well as by its border colour, so how it went is never carried by
 * colour alone (WCAG 2.2 AA, 1.4.1).
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

  // Unreadable entries are not a failed import, but the user is left with less
  // than the file promised and should see that at a glance.
  return { text: parts.join(' '), wentWrong: outcome.unusable > 0 };
}

/**
 * Deleting everything, behind a question. The warning appears only once the
 * button is pressed, so it is read at the moment it matters rather than sitting
 * there being ignored, and it says what goes and that nothing brings it back
 * (WCAG 2.2 AA, 3.3.4).
 *
 * "Nothing to delete" means nothing at all is stored, not merely an empty list:
 * categories, tags and status values outlive the links that used them, and
 * clearing those is part of the same right (§7.3).
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
   * The question replaces the button that was pressed, so focus has to be handed
   * over or it falls back to the document and a keyboard user tabs in from the
   * top again. The question carries the warning as its accessible name, so
   * moving focus there is also what reads the warning out before it can be
   * answered — without it the one safeguard against an irreversible deletion is
   * silent (WCAG 2.2 AA, 4.1.3).
   *
   * Answering hands focus back, except after a deletion, which leaves the button
   * disabled and unfocusable; the notice announces what happened instead.
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

        <Button
          ref={triggerRef}
          type="button"
          variant="outline-strong"
          onClick={() => setIsAsking(true)}
          disabled={!hasAnythingToDelete}
          className="w-fit"
        >
          {t('data.deleteAll.action')}
        </Button>

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
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            void deleteAllSavedData().then(() => {
              setIsAsking(false);
              onDeleted();
            });
          }}
        >
          {t('data.deleteAll.confirm')}
        </Button>

        <Button type="button" variant="outline" onClick={() => setIsAsking(false)}>
          {t('data.deleteAll.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hands the file to the browser's own download — a blob and a link click rather
 * than the `downloads` permission, which would buy nothing for a file built
 * here and cost the user a warning (docs/concept.md §7.4).
 */
function downloadJson(contents: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  // Both for Firefox, which ignores a click on a link that is not in the page,
  // and cancels a download whose blob URL is revoked in the same turn.
  document.body.append(link);
  link.click();
  link.remove();

  // The blob occupies memory for as long as its URL exists.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/** Long enough for the download to have taken the blob, short enough to not hold it. */
const REVOKE_DELAY_MS = 1000;
