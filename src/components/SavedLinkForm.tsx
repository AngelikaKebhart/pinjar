import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from '@/src/i18n/context';
import { DEFAULT_STATUS, type LinkStatus, type SavedLinkEdits } from '@/src/lib/saved-link';
import { getCategories, getCustomStatuses } from '@/src/lib/storage';

/**
 * Form for the fields the user owns: title, category, tags, status, note.
 *
 * The URL is not among them — it identifies the link, and editing it would
 * silently turn one saved page into another (docs/concept.md §3.1).
 *
 * Everything here is a native form control with a real label. A custom widget
 * would have to re-earn keyboard operability, screen reader announcements and
 * the browser's own localization, and would almost certainly earn less.
 */
export function SavedLinkForm({
  link,
  onSave,
  onCancel,
}: {
  link: {
    title: string;
    category: string | null;
    tags: string[];
    status: LinkStatus;
    note: string;
  };
  onSave: (edits: SavedLinkEdits) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(link.title);
  const [category, setCategory] = useState(link.category ?? '');
  // Comma-separated rather than a chip widget: one plain text field is
  // keyboard operable and announced correctly without any extra work, and the
  // model already drops blanks and repetitions.
  const [tags, setTags] = useState(link.tags.join(', '));
  const [note, setNote] = useState(link.note);
  const [statusChoice, setStatusChoice] = useState(() => statusToChoice(link.status));
  const [newStatus, setNewStatus] = useState('');

  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [knownStatuses, setKnownStatuses] = useState<string[]>([]);

  // Opening the form moves focus into it; otherwise the keyboard user is left
  // behind on a button that no longer exists.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    void Promise.all([getCategories(), getCustomStatuses()]).then(([categories, statuses]) => {
      setKnownCategories(categories);
      // A status still in use belongs in the list even if the stored
      // suggestions somehow lost it.
      setKnownStatuses(withCurrentStatus(statuses, link.status));
    });
  }, [link.status]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    void onSave({
      title,
      category,
      tags: tags.split(','),
      note,
      status: choiceToStatus(statusChoice, newStatus),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('editLink.formLabel', { title: link.title })}
      className="flex flex-col gap-3"
    >
      <Field label={t('dashboard.link.title')} htmlFor={`${fieldId}-title`}>
        <input
          ref={titleRef}
          id={`${fieldId}-title`}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={INPUT_CLASSES}
        />
      </Field>

      <Field label={t('dashboard.link.category')} htmlFor={`${fieldId}-category`}>
        {/*
          Free text with suggestions rather than a dropdown: categories are the
          user's own, and a new one has to be creatable right here.
        */}
        <input
          id={`${fieldId}-category`}
          type="text"
          list={`${fieldId}-categories`}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={INPUT_CLASSES}
        />
        <datalist id={`${fieldId}-categories`}>
          {knownCategories.map((known) => (
            <option key={known} value={known} />
          ))}
        </datalist>
      </Field>

      <Field
        label={t('dashboard.link.tags')}
        htmlFor={`${fieldId}-tags`}
        hint={t('editLink.tagsHint')}
        hintId={`${fieldId}-tags-hint`}
      >
        <input
          id={`${fieldId}-tags`}
          type="text"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          aria-describedby={`${fieldId}-tags-hint`}
          className={INPUT_CLASSES}
        />
      </Field>

      <Field label={t('dashboard.link.status')} htmlFor={`${fieldId}-status`}>
        <select
          id={`${fieldId}-status`}
          value={statusChoice}
          onChange={(event) => setStatusChoice(event.target.value)}
          className={INPUT_CLASSES}
        >
          {/* The built-in status is the only translated one (§4). */}
          <option value={BUILTIN_CHOICE}>{t('status.default')}</option>

          {knownStatuses.map((label) => (
            <option key={label} value={`${CUSTOM_PREFIX}${label}`}>
              {label}
            </option>
          ))}

          <option value={NEW_CHOICE}>{t('editLink.statusNew')}</option>
        </select>
      </Field>

      {statusChoice === NEW_CHOICE && (
        <Field label={t('editLink.statusNewLabel')} htmlFor={`${fieldId}-new-status`}>
          <input
            id={`${fieldId}-new-status`}
            type="text"
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value)}
            className={INPUT_CLASSES}
          />
        </Field>
      )}

      <Field label={t('dashboard.link.note')} htmlFor={`${fieldId}-note`}>
        <textarea
          id={`${fieldId}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className={INPUT_CLASSES}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-strong"
        >
          {t('editLink.save')}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
        >
          {t('editLink.cancel')}
        </button>
      </div>
    </form>
  );
}

/**
 * A labelled field.
 *
 * A real label rather than a placeholder: a placeholder disappears as soon as
 * there is input, which is exactly when someone returning to a half-filled
 * form needs it (WCAG 2.2 AA, 3.3.2).
 */
function Field({
  label,
  htmlFor,
  hint,
  hintId,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  hintId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>

      {hint !== undefined && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}

      {children}
    </div>
  );
}

const INPUT_CLASSES =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink';

/**
 * The status is a tagged union, so a `<select>` cannot carry it as a plain
 * value. These prefixes keep the two kinds apart — a custom status named like
 * the built-in one still round-trips as custom.
 */
const BUILTIN_CHOICE = 'builtin';
const CUSTOM_PREFIX = 'custom:';
const NEW_CHOICE = 'new';

function statusToChoice(status: LinkStatus): string {
  return status.kind === 'builtin' ? BUILTIN_CHOICE : `${CUSTOM_PREFIX}${status.label}`;
}

function choiceToStatus(choice: string, newStatus: string): LinkStatus {
  if (choice === NEW_CHOICE) {
    // An empty label falls back to the built-in status; the model enforces it.
    return { kind: 'custom', label: newStatus };
  }

  return choice.startsWith(CUSTOM_PREFIX)
    ? { kind: 'custom', label: choice.slice(CUSTOM_PREFIX.length) }
    : DEFAULT_STATUS;
}

function withCurrentStatus(known: string[], status: LinkStatus): string[] {
  if (status.kind === 'builtin' || known.includes(status.label)) {
    return known;
  }

  return [...known, status.label];
}
