import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { DeletePanel } from '@/src/components/DeletePanel';
import { SavedLinkActions } from '@/src/components/SavedLinkActions';
import { SavedLinkForm } from '@/src/components/SavedLinkForm';
import { StatusLabel } from '@/src/components/StatusLabel';
import { useTranslation } from '@/src/i18n/context';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';

type ActivePanel = 'editing' | 'deleting' | null;

/**
 * One saved link in the dashboard list.
 *
 * Everything shown here — title, image, note — either comes from an untrusted
 * page or from the user, and is rendered as plain JSX so React escapes it.
 * `dangerouslySetInnerHTML` is forbidden project-wide (docs/concept.md §7.4).
 *
 * Built like the popup's row: a line that names the link and carries its two
 * buttons, and under it either the details or the form. The buttons used to
 * sit in a column of their own at the right of the card and disappeared while
 * the form was open — which took away the way back out and, below the
 * breakpoint where that column stacks, would have left it stranded underneath
 * a form several screens long.
 *
 * The card stacks until there is room beside the preview image. At 320 CSS px —
 * what 400% zoom leaves of a normal screen — the fixed 96px image plus its gap
 * would take most of the width, and the text beside it would break character by
 * character (WCAG 2.2 AA, 1.4.10).
 */
export function SavedLinkCard({
  link,
  isEditing,
  onEditingChange,
  onDelete,
  onEdit,
  editButtonRef,
}: {
  link: SavedLink;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onDelete: () => void | Promise<void>;
  onEdit: (edits: SavedLinkEdits) => void | Promise<void>;
  editButtonRef?: Ref<HTMLButtonElement>;
}) {
  const { t, formatDate } = useTranslation();
  const formId = useId();
  const [activePanel, setActivePanel] = useState<ActivePanel>(isEditing ? 'editing' : null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isEditing && activePanel !== 'editing') {
      setActivePanel('editing');
    } else if (!isEditing && activePanel === 'editing') {
      setActivePanel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const setPanel = (panel: ActivePanel) => {
    setActivePanel(panel);
    if (panel === null) {
      onEditingChange(false);
      if (activePanel === 'deleting') {
        deleteButtonRef.current?.focus();
      }
    } else if (panel === 'editing') {
      onEditingChange(true);
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row">
      <PreviewImage link={link} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/*
          The buttons keep to the right edge of the card at every width, which
          is also where the delete question needs them: its panel is anchored
          to their right edge and would otherwise hang off the side of a 320px
          card. The floor under the title lets them drop to a line of their own
          rather than squeezing it (1.4.10).
        */}
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="min-w-40 flex-1 text-base font-medium">
            {/* A new tab, so the dashboard the user is working in stays put. */}
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="break-words text-link underline hover:text-link-strong cursor-pointer"
            >
              {link.title}
            </a>
          </h3>

          <SavedLinkActions
            title={link.title}
            activePanel={activePanel}
            formId={formId}
            onToggleEdit={() => setPanel(activePanel === 'editing' ? null : 'editing')}
            onToggleDelete={() => setPanel(activePanel === 'deleting' ? null : 'deleting')}
            editButtonRef={editButtonRef}
            deleteButtonRef={deleteButtonRef}
          />
        </div>

        <p className="text-sm text-ink-muted">
          {link.domain} · {formatDate(link.createdAt)}
        </p>

        {activePanel === 'editing' ? (
          <SavedLinkForm
            id={formId}
            link={link}
            onSave={async (edits) => {
              await onEdit(edits);
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
            onDelete={() => setPanel('deleting')}
          />
        ) : activePanel === 'deleting' ? (
          <DeletePanel
            title={link.title}
            onConfirm={async () => {
              await onDelete();
            }}
            onCancel={() => setPanel(null)}
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
                      <li
                        key={tag}
                        className="rounded-full bg-pill px-3 py-1 text-xs font-bold break-words text-pill-ink"
                      >
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
      className="size-24 shrink-0 rounded-control border border-line object-cover"
    />
  );
}
