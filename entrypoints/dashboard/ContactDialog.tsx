import { Dialog } from '@/src/components/Dialog';
import { useTranslation } from '@/src/i18n/context';

/**
 * Where the address that receives it all is kept.
 *
 * Not a catalog entry: it reads the same in either language, and a string that
 * has to be identical in two files is a string that will one day differ in two
 * files.
 */
const CONTACT_EMAIL = 'pinjar@kebhart.net';

/**
 * How to report a problem, ask something, or suggest an improvement.
 *
 * Behind the manage menu with the rest of the chores rather than in a footer
 * under the list: the page is for reading pins, and a paragraph that is looked
 * for perhaps twice in a lifetime should not stand between the user and the
 * last of them every day.
 */
export function ContactDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  /*
   * A subject line, so a message arrives already saying what it is about. The
   * address itself is the link text: mail clients can be set up in ways that
   * swallow a `mailto:`, and then the address is at least there to be copied.
   */
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('contact.mailSubject'))}`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('contact.heading')}>
      <div className="flex flex-col gap-4 text-sm">
        <p>{t('contact.intro')}</p>

        {/*
          On a line of its own rather than running on from the sentence above:
          the address is what the reader came for and what they may want to
          copy, and a link that ends a paragraph is harder to hit than one
          standing alone.
        */}
        <p>
          <a href={mailto} className="break-words text-link underline hover:text-link-strong">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </Dialog>
  );
}
