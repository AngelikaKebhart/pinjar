import { useTranslation } from '@/src/i18n/context';
import type { MessageParams } from '@/src/i18n/format';
import type { MessageKey, PluralMessageKey } from '@/src/i18n/messages';

/**
 * What just happened to a saved link, kept as a key rather than as a sentence
 * so that switching language re-reads it instead of leaving the last message
 * behind in the old one.
 *
 * A message that says how many carries the number instead of the finished
 * sentence, for the same reason: which of a language's plural forms that is
 * cannot be decided until the language is known.
 */
export type FeedbackMessage =
  | { key: MessageKey; count?: undefined; params?: MessageParams }
  | { key: PluralMessageKey; count: number; params?: MessageParams };

/**
 * The one line that says an action went through.
 *
 * Announced as well as shown: saving an edit changes a card the user may not be
 * looking at, and a deletion removes the only thing that could have carried the
 * news. Polite, so it waits for a pause rather than cutting in.
 *
 * It stays until the next action rather than fading on a timer nobody can
 * outrun (WCAG 2.2 AA, 2.2.1).
 *
 * While it has nothing to say it takes itself out of the flow (`empty:absolute`)
 * instead of merely being empty: an empty line is still an item of the layout
 * around it and would keep a gap on either side of itself, which is what made
 * the popup's content sit lower under the save button than above the one below
 * it. Out of flow it costs nothing, and the surrounding gaps close.
 *
 * What it does not do is disappear: the element stays in the page rather than
 * being rendered only once there is a message, because a live region has to be
 * there before the text arrives — appearing together with it, it goes
 * unannounced.
 */
export function ActionFeedback({ message }: { message: FeedbackMessage | null }) {
  const { t, plural } = useTranslation();

  return (
    <p aria-live="polite" className="text-sm text-ink-muted empty:absolute">
      {message === null
        ? ''
        : message.count === undefined
          ? t(message.key, message.params)
          : plural(message.key, message.count, message.params)}
    </p>
  );
}
