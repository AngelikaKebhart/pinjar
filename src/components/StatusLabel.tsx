import { useTranslation } from '@/src/i18n/context';
import type { LinkStatus } from '@/src/lib/saved-link';

/**
 * Shows the status of a link, translating only the ones we ship — the single
 * home of the rule from docs/concept.md §4: the built-in status is stored as a
 * language-neutral key and shown in the active language, a status the user
 * typed is shown as typed in every language. Deciding that per call site is how
 * the two would drift apart.
 */
export function StatusLabel({ status }: { status: LinkStatus }) {
  const { t } = useTranslation();
  const label = status.kind === 'builtin' ? t(`status.${status.key}`) : status.label;

  /*
   * Plain text, styled like the category beside it. A status is one value, the
   * way a category is one value — the pill it used to wear belongs to the tags,
   * which are a set and need their boundaries drawn. Carrying no styling of its
   * own also settles WCAG 1.4.1 outright: there is no color left to mistake for
   * the meaning.
   */
  return label;
}
