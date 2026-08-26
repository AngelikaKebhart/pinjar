import { useTranslation } from '@/src/i18n/context';
import type { MessageParams } from '@/src/i18n/format';
import type { MessageKey } from '@/src/i18n/messages';

/**
 * What just happened to a saved link, kept as a key rather than as a sentence
 * so that switching language re-reads it instead of leaving the last message
 * behind in the old one.
 */
export interface FeedbackMessage {
  key: MessageKey;
  params?: MessageParams;
}

/**
 * The one line that says an action went through.
 *
 * Announced as well as shown: saving an edit changes a card the user may not be
 * looking at, and a deletion removes the only thing that could have carried the
 * news. Polite, so it waits for a pause rather than cutting in.
 *
 * It stays until the next action rather than fading on a timer nobody can
 * outrun (WCAG 2.2 AA, 2.2.1), and keeps its height while empty so the first
 * message does not push the page down.
 */
export function ActionFeedback({ message }: { message: FeedbackMessage | null }) {
  const { t } = useTranslation();

  return (
    <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
      {message === null ? '' : t(message.key, message.params)}
    </p>
  );
}
