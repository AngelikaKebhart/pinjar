import { useState } from 'react';
import { useTranslation } from '@/src/i18n/context';
import type { MessageKey } from '@/src/i18n/messages';
import { buildExportFile, exportFileName } from '@/src/lib/transfer';

/**
 * Carrying the wishlist out as a file (docs/concept.md §3.6).
 *
 * The warning that the file is unencrypted stands above the button, not in
 * the confirmation below it: it is only of use while the user can still
 * decide against pressing (docs/concept.md §7.4).
 */
export function DataSection({ hasSavedLinks }: { hasSavedLinks: boolean }) {
  const { t } = useTranslation();

  /*
   * The key, not the translated sentence. A message kept as finished text
   * stays in the language it was made in, and would still be sitting there in
   * German after the user switched the dashboard to English (§3.7).
   */
  const [statusKey, setStatusKey] = useState<MessageKey | null>(null);

  const handleExport = async () => {
    const file = await buildExportFile();

    downloadJson(JSON.stringify(file, null, 2), exportFileName());
    setStatusKey('data.export.done');
  };

  return (
    <div className="flex flex-col gap-2">
      {/*
        With nothing saved, the warning about notes in the file describes a
        file that would hold none — so the empty case says what is actually
        the matter, and doubles as the reason the button cannot be pressed.
      */}
      <p className="text-sm text-ink-muted">
        {hasSavedLinks ? t('data.export.hint') : t('data.export.nothingYet')}
      </p>

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={!hasSavedLinks}
        className="w-fit rounded-md border border-line-strong px-3 py-2 text-sm font-medium enabled:hover:bg-surface-hover disabled:border-line disabled:text-ink-muted"
      >
        {t('data.export.action')}
      </button>

      {/*
        Where the file ends up afterwards is the browser's business, so this
        is the only feedback the extension itself gives — which is why it is
        drawn as a panel rather than a line of grey text, and marked by a
        glyph as well as by its border (WCAG 2.2 AA, 1.4.1).

        The region itself is always in the document and keeps its height: a
        live region that only appears together with its text is announced
        unreliably, and the section would jump as it did so.
      */}
      <div aria-live="polite" className="min-h-11">
        {statusKey !== null && (
          <p className="flex w-fit items-center gap-2 rounded-md border border-accent bg-surface px-3 py-2 text-sm font-medium">
            <span aria-hidden="true">✓</span>
            {t(statusKey)}
          </p>
        )}
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
