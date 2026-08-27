import { useId, useState } from 'react';
import { DeletePanel } from '@/src/components/DeletePanel';
import { SavedLinkActions } from '@/src/components/SavedLinkActions';
import { SavedLinkForm } from '@/src/components/SavedLinkForm';
import { StatusLabel } from '@/src/components/StatusLabel';
import type { LinkPanels } from '@/src/components/useLinkPanels';
import { useTranslation } from '@/src/i18n/context';
import type { SavedLink, SavedLinkEdits } from '@/src/lib/saved-link';

/**
 * One saved link in the dashboard list.
 *
 * Everything shown here — title, image, note — comes from an untrusted page or
 * from the user, and is rendered as plain JSX so React escapes it.
 * `dangerouslySetInnerHTML` is forbidden project-wide (docs/concept.md §7.4).
 *
 * Built like the popup's row: a line that names the link and carries its two
 * buttons, and under it either the details or the form. The buttons stay on
 * that line rather than in a column at the right of the card, which would put
 * the way back out below a form several screens long once it stacks.
 *
 * Which panels are open lives in `panels`, one list-wide answer shared with the
 * popup: a card remembering it itself could not know what the card above it was
 * showing.
 *
 * The card stacks until there is room beside the preview image. At 320 CSS px —
 * what 400% zoom leaves of a normal screen — the fixed 96px image and its gap
 * would take most of the width and break the text beside it character by
 * character (WCAG 2.2 AA, 1.4.10).
 */
export function SavedLinkCard({
  link,
  panels,
  onDelete,
  onEdit,
}: {
  link: SavedLink;
  panels: LinkPanels;
  onDelete: () => void | Promise<void>;
  onEdit: (edits: SavedLinkEdits) => void | Promise<void>;
}) {
  const { t, formatDate } = useTranslation();
  const formId = useId();
  const questionId = useId();

  const isEditing = panels.editingId === link.id;
  const isAsking = panels.deletingId === link.id;

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row">
      <PreviewImage link={link} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/*
          The buttons keep to the right edge at every width; the floor under the
          title lets them drop to a line of their own rather than squeeze it
          (1.4.10).
        */}
        <div className="flex flex-wrap items-start gap-2">
          {/*
            The card's own heading, and the one thing on it read first, so it
            is set two steps above the body. `text-base` gave it a single pixel
            over a 15px body and `text-lg` three — at either distance the title
            and the line under it read as one block of equal weight, which is
            what a heading may not do.
          */}
          <h3 className="min-w-40 flex-1 text-xl font-semibold">
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

          <SavedLinkActions
            id={link.id}
            title={link.title}
            panels={panels}
            formId={formId}
            questionId={questionId}
          />
        </div>

        {/*
          Where it came from, then when it was saved — the two set apart rather
          than run together at one weight.

          The domain looked smaller than the date beside it at the same size,
          and it was not an illusion to argue with: Nunito ships lining figures
          only — the subset in `public/fonts` carries no `onum` feature — so
          every digit stands at cap height while "www.snaply.de" is mostly
          x-height, some 30% shorter.

          So the date is taken down until the two read as one size, and the
          domain is left exactly as the line sets it. It has to be the size
          that gives, not the weight or the colour: both of those were tried
          and both were seen as a colour difference rather than as the
          correction they were meant to be — bolder grey against the same grey
          simply reads darker.

          `em`, so it stays tied to whatever this line is set in. And the 15px
          floor the rest of the extension keeps does not reach here: this is an
          optical correction inside one line, bringing digits that stand too
          tall back to the size they already look like — not a step down the
          type scale, which is why it is a loose number and not a token.
        */}
        <p className="text-sm text-ink-muted">
          {link.domain} · <span className="text-[0.9em]">{formatDate(link.createdAt)}</span>
        </p>

        {isEditing ? (
          <SavedLinkForm
            id={formId}
            link={link}
            onSave={async (edits) => {
              await onEdit(edits);
              panels.toggleEditing(link.id);
            }}
            onCancel={() => panels.toggleEditing(link.id)}
          />
        ) : (
          /*
           * A description list, because every row is a label and its value —
           * what lets a screen reader announce "Category: Fabrics" instead of
           * two unrelated words. The auto column keeps the longer German labels
           * from squeezing the values, stacked while narrow and side by side
           * once the label column can have its width.
           *
           * The row gap has to stay clear of the leading inside a row: a long
           * note wraps, and at a tighter gap than this its second line reads as
           * a new entry rather than the rest of the note.
           */
          <dl className="grid grid-cols-1 gap-x-3 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {/*
              Category, status, tags, note — widest first, then narrowing:
              which shelf the link is on, how far along it is, what it is about,
              and last whatever the user wrote themselves. `ManageMenu` lists
              the same three in the same order.
            */}
            {link.category !== null && (
              <>
                <dt className="text-ink-muted">{t('dashboard.link.category')}</dt>
                <dd className="break-words">{link.category}</dd>
              </>
            )}

            <dt className="text-ink-muted">{t('dashboard.link.status')}</dt>
            <dd className="break-words">
              <StatusLabel status={link.status} />
            </dd>

            {link.tags.length > 0 && (
              <>
                <dt className="text-ink-muted">{t('dashboard.link.tags')}</dt>
                <dd>
                  {/*
                    The only text in the extension set below the body size, and
                    the only pills left now that the status is plain text. Both
                    facts are the same decision: a pill is here to draw the
                    boundary between one tag and the next, which is a job for a
                    small marker beside the text rather than a second voice
                    competing with it.

                    They are not controls — nothing here is clickable — so the
                    24px floor for pointer targets (WCAG 2.5.8) does not apply.
                  */}
                  <ul className="flex flex-wrap gap-1">
                    {link.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-pill px-3 py-0.5 text-xs font-bold break-words text-pill-ink"
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

        {/*
          The form and the question share this place, one at a time: opening
          either closes the other, so the filled button is always the one whose
          panel is showing.
        */}
        {isAsking && (
          <DeletePanel
            id={questionId}
            title={link.title}
            onConfirm={onDelete}
            onCancel={() => panels.toggleDeleting(link.id)}
          />
        )}
      </div>
    </article>
  );
}

/**
 * The preview image, or nothing at all.
 *
 * No referrer, so the site never learns its image is being loaded from a
 * wishlist, and no load before it is scrolled into view. Both limit what
 * opening the dashboard tells the servers the images live on.
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
      // The best description available; a screen reader would otherwise
      // announce the file name or nothing at all.
      alt={link.title}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasFailed(true)}
      className="size-24 shrink-0 rounded-control border border-line object-cover"
    />
  );
}
