import { useState } from 'react';
import { DeleteLinkButton } from '@/src/components/DeleteLinkButton';
import { StatusLabel } from '@/src/components/StatusLabel';
import { useTranslation } from '@/src/i18n/context';
import type { SavedLink } from '@/src/lib/saved-link';

/**
 * One saved link in the dashboard list.
 *
 * Everything shown here — title, image, note — either comes from an untrusted
 * page or from the user, and is rendered as plain JSX so React escapes it.
 * `dangerouslySetInnerHTML` is forbidden project-wide (docs/concept.md §7.4).
 */
export function SavedLinkCard({
  link,
  onDelete,
}: {
  link: SavedLink;
  onDelete: () => void | Promise<void>;
}) {
  const { t, formatDate } = useTranslation();

  return (
    <article className="flex gap-4 rounded-lg border border-slate-300 p-4">
      <PreviewImage link={link} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-base font-medium">
          {/* A new tab, so the dashboard the user is working in stays put. */}
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="break-words text-blue-800 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {link.title}
          </a>
        </h3>

        <p className="text-sm text-slate-700">
          {link.domain} · {formatDate(link.createdAt)}
        </p>

        {/*
          A description list, because every row is a label and its value. That
          is what lets a screen reader announce "Category: Fabrics" instead of
          two unrelated words, and the auto column keeps the longer German
          labels from squeezing the values.
        */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-700">{t('dashboard.link.status')}</dt>
          <dd>
            <StatusLabel status={link.status} />
          </dd>

          {link.category !== null && (
            <>
              <dt className="text-slate-700">{t('dashboard.link.category')}</dt>
              <dd className="break-words">{link.category}</dd>
            </>
          )}

          {link.tags.length > 0 && (
            <>
              <dt className="text-slate-700">{t('dashboard.link.tags')}</dt>
              <dd>
                <ul className="flex flex-wrap gap-1">
                  {link.tags.map((tag) => (
                    <li key={tag} className="rounded bg-slate-100 px-2 py-0.5 break-words">
                      {tag}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}

          {link.note !== '' && (
            <>
              <dt className="text-slate-700">{t('dashboard.link.note')}</dt>
              <dd className="break-words whitespace-pre-line">{link.note}</dd>
            </>
          )}
        </dl>

        <div className="mt-1">
          <DeleteLinkButton title={link.title} onDelete={onDelete} />
        </div>
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
      className="size-24 shrink-0 rounded-md border border-slate-200 object-cover"
    />
  );
}
