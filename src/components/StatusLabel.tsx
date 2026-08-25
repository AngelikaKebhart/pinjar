import { useTranslation } from '@/src/i18n/context';
import type { LinkStatus } from '@/src/lib/saved-link';

/**
 * Shows the status of a link, translating only the ones we ship.
 *
 * This is the single home of the rule from docs/concept.md §4: the built-in
 * status is stored as a language-neutral key and shown in the active language,
 * while a status the user typed is shown exactly as typed, in every language.
 * Deciding that per call site is how the two would eventually drift apart.
 */
export function StatusLabel({ status }: { status: LinkStatus }) {
  const { t } = useTranslation();
  const label = status.kind === 'builtin' ? t(`status.${status.key}`) : status.label;

  return (
    // The status is carried by its text, never by color alone (WCAG 1.4.1) —
    // which is also why it shares the one pill tone with the tags rather than
    // having a shade of its own.
    <span className="inline-block rounded-full bg-pill px-3 py-1 text-xs font-bold text-pill-ink">
      {label}
    </span>
  );
}
