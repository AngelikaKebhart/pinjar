import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/i18n/context';
import type { MessageParams } from '@/src/i18n/format';
import type { MessageKey, PluralMessageKey } from '@/src/i18n/messages';

/**
 * How an action turned out. Only two, on purpose: the sentence already says
 * what happened, and a third shade would ask the reader to tell an unimportant
 * glyph from a mildly important one.
 */
export type FeedbackTone = 'done' | 'problem';

/**
 * What just happened to a saved link, kept as a key rather than as a sentence
 * so that switching language re-reads it instead of leaving the last message
 * behind in the old one.
 *
 * A message that says how many carries the number instead of the finished
 * sentence, for the same reason: which of a language's plural forms that is
 * cannot be decided until the language is known.
 */
export type FeedbackMessage = { tone?: FeedbackTone } & (
  | { key: MessageKey; count?: undefined; params?: MessageParams }
  | { key: PluralMessageKey; count: number; params?: MessageParams }
);

/**
 * The look every "that worked" and "that did not" in the extension shares: a
 * glyph, and the sentence in body ink at medium weight.
 *
 * No box around it. The message belongs to the button above it rather than
 * being a thing of its own, and the panel it used to sit in on the data page
 * made it read as the more important half of the pair. What it does keep from
 * that panel is the glyph, which is what lifts it clear of the ordinary grey
 * hints on the same screens — the difference between "here is how this works"
 * and "here is what just happened".
 *
 * The glyph is redundant, not informative: the sentence says how it went, so
 * the tone is never the only thing carrying that (WCAG 2.2 AA, 1.4.1) and the
 * shape is hidden from assistive technology, which would otherwise announce a
 * tick before every message it already reads out in full.
 */
export function FeedbackLine({
  tone = 'done',
  children,
}: {
  tone?: FeedbackTone;
  children: ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-sm font-medium text-ink">
      <span className={tone === 'problem' ? 'shrink-0 text-danger' : 'shrink-0 text-accent'}>
        {tone === 'problem' ? <AlertIcon /> : <CheckIcon />}
      </span>
      {children}
    </p>
  );
}

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
    <div aria-live="polite" className="empty:absolute">
      {message !== null && (
        <FeedbackLine tone={message.tone}>
          {message.count === undefined
            ? t(message.key, message.params)
            : plural(message.key, message.count, message.params)}
        </FeedbackLine>
      )}
    </div>
  );
}
