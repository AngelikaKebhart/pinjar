import { useRef, useState } from 'react';
import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { EditLinkButton } from '@/src/components/EditLinkButton';
import { SavedLinkForm } from '@/src/components/SavedLinkForm';
import { StatusLabel } from '@/src/components/StatusLabel';
import { useTranslation } from '@/src/i18n/context';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';

/**
 * One saved link in the dashboard list.
 *
 * Everything shown here — title, image, note — either comes from an untrusted
 * page or from the user, and is rendered as plain JSX so React escapes it.
 * `dangerouslySetInnerHTML` is forbidden project-wide (docs/concept.md §7.4).
 *
 * The card stacks until there is room beside the preview image. At 320 CSS px —
 * what 400% zoom leaves of a normal screen — the fixed 96px image plus its gap
 * would take most of the width, and the text beside it would break character by
 * character (WCAG 2.2 AA, 1.4.10).
 */
export function SavedLinkCard({
  link,
  onDelete,
  onEdit,
}: {
  link: SavedLink;
  onDelete: () => void | Promise<void>;
  onEdit: (edits: SavedLinkEdits) => void | Promise<void>;
}) {
  const { t, formatDate } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Closing the form hands focus back to the button that opened it. Without
   * this, focus falls to the document and a keyboard user starts over at the
   * top of a list that may be long.
   */
  const closeForm = () => {
    setIsEditing(false);
    // The button only exists again after the form is gone.
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row">
      <PreviewImage link={link} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-base font-medium">
          {/* A new tab, so the dashboard the user is working in stays put. */}
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="break-words text-link underline hover:text-link-strong"
          >
            {link.title}
          </a>
        </h3>

        <p className="text-sm text-ink-muted">
          {link.domain} · {formatDate(link.createdAt)}
        </p>

        {isEditing ? (
          <SavedLinkForm
            link={link}
            onSave={async (edits) => {
              await onEdit(edits);
              closeForm();
            }}
            onCancel={closeForm}
          />
        ) : (
          /*
           * A description list, because every row is a label and its value.
           * That is what lets a screen reader announce "Category: Fabrics"
           * instead of two unrelated words, and the auto column keeps the
           * longer German labels from squeezing the values.
           *
           * Label above value while narrow, side by side once the label column
           * can have its width without starving the value.
           */
          <dl className="grid grid-cols-1 gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-ink-muted">{t('dashboard.link.status')}</dt>
            <dd>
              <StatusLabel status={link.status} />
            </dd>

            {link.category !== null && (
              <>
                <dt className="text-ink-muted">{t('dashboard.link.category')}</dt>
                <dd className="break-words">{link.category}</dd>
              </>
            )}

            {link.tags.length > 0 && (
              <>
                <dt className="text-ink-muted">{t('dashboard.link.tags')}</dt>
                <dd>
                  <ul className="flex flex-wrap gap-1">
                    {link.tags.map((tag) => (
                      <li key={tag} className="rounded bg-chip px-2 py-0.5 break-words">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}

            {link.note !== '' && (
              <>
                <dt className="text-ink-muted">{t('dashboard.link.note')}</dt>
                <dd className="break-words whitespace-pre-line">{link.note}</dd>
              </>
            )}
          </dl>
        )}
      </div>

      {/*
        Beside the content rather than under it, and gone while the form has
        the card — the form brings its own Save and Cancel, and a second pair
        of buttons next to them would only invite the wrong one.

        Capped in width so that the delete question, which is words and not an
        icon, wraps inside this column instead of taking the room from the
        text. Below the breakpoint the card stacks and they end up under the
        content anyway, which at 320px is the only place they fit (1.4.10).
      */}
      {!isEditing && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-36 sm:justify-end">
          <EditLinkButton
            ref={editButtonRef}
            title={link.title}
            onEdit={() => setIsEditing(true)}
          />

          <DeleteLinkButton title={link.title} onDelete={onDelete} />
        </div>
      )}
    </article>
  );
}

/**
 * The preview image, or nothing at all.
 *
 * Two things it deliberately does not do: it does not send a referrer, so the
 * site never learns that its image is being loaded from a wishlist, and it
 * does not load until it is scrolled into view. Both limit what opening the
 * dashboard tells the servers the images live on.
 *
 * A preview that fails to load is dropped rather than left as a broken icon:
 * these URLs are months old by the time they are looked at, and images move.
 */
function PreviewImage({ link }: { link: SavedLink }) {
  const [hasFailed, setHasFailed] = useState(false);

  if (link.imageUrl === null || hasFailed) {
    return null;
  }

  return (
    <img
      src={link.imageUrl}
      // The title is the best description available; a screen reader would
      // otherwise announce the file name or nothing at all.
      alt={link.title}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasFailed(true)}
      className="size-24 shrink-0 rounded-md border border-line object-cover"
    />
  );
}
