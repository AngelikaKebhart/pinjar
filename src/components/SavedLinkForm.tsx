import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from '@/src/i18n/context';
import { DEFAULT_STATUS, type LinkStatus, type SavedLinkEdits } from '@/src/lib/saved-link';
import { getCategories, getCustomStatuses, getTags } from '@/src/lib/storage';

/**
 * Form for the fields the user owns: title, category, tags, status, note.
 *
 * The URL is not among them — it identifies the link, and editing it would
 * silently turn one saved page into another (docs/concept.md §3.1).
 *
 * Category, tags and status all work the same way: pick from what you used
 * before, or add something new that is then offered on the next link. That is
 * the whole point of keeping those lists in storage (§4) — nobody should have
 * to retype "Schnittmuster" for the twentieth time and hope they spell it the
 * same way, because a typo silently creates a second category.
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
  const [note, setNote] = useState(link.note);

  const [categoryChoice, setCategoryChoice] = useState(() => categoryToChoice(link.category));
  const [newCategory, setNewCategory] = useState('');

  const [checkedTags, setCheckedTags] = useState<string[]>(link.tags);
  const [newTags, setNewTags] = useState('');

  const [statusChoice, setStatusChoice] = useState(() => statusToChoice(link.status));
  const [newStatus, setNewStatus] = useState('');

  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>(link.tags);
  const [knownStatuses, setKnownStatuses] = useState<string[]>([]);

  // Opening the form moves focus into it; otherwise the keyboard user is left
  // behind on a button that no longer exists.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    void Promise.all([getCategories(), getTags(), getCustomStatuses()]).then(
      ([categories, tags, statuses]) => {
        // What this link already carries always belongs in its list, even if
        // the stored suggestions somehow lost it — otherwise editing anything
        // else on the card would quietly drop it.
        setKnownCategories(including(categories, link.category));
        setKnownTags(union(tags, link.tags));
        setKnownStatuses(including(statuses, customLabelOf(link.status)));
      },
    );
  }, [link.category, link.tags, link.status]);

  const toggleTag = (tag: string) => {
    setCheckedTags((checked) =>
      checked.includes(tag) ? checked.filter((each) => each !== tag) : [...checked, tag],
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    void onSave({
      title,
      category: choiceToCategory(categoryChoice, newCategory),
      // Trimming, de-duplicating and dropping blanks is the model's job, so
      // the freshly typed ones can simply be appended.
      tags: [...checkedTags, ...newTags.split(',')],
      status: choiceToStatus(statusChoice, newStatus),
      note,
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

      <ChoiceOrNewField
        id={`${fieldId}-category`}
        label={t('dashboard.link.category')}
        choice={categoryChoice}
        onChoose={setCategoryChoice}
        options={[
          { value: NONE_CHOICE, label: t('editLink.categoryNone') },
          ...knownCategories.map((known) => ({ value: `${KNOWN_PREFIX}${known}`, label: known })),
        ]}
        newOptionLabel={t('editLink.categoryNew')}
        newValueLabel={t('editLink.categoryNewLabel')}
        newValue={newCategory}
        onNewValue={setNewCategory}
      />

      <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
        {/*
          A fieldset with a legend, because the checkboxes and the field for
          new ones only make sense together — a screen reader announces the
          group name with every one of them.
        */}
        <legend className="px-1 text-sm font-medium">{t('dashboard.link.tags')}</legend>

        {knownTags.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('editLink.tagsNone')}</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">{t('editLink.tagsKnown')}</p>

            {/*
              Checkboxes rather than a multi-select: picking several is one
              click each instead of a modifier key, and the current selection
              stays readable at a glance.
            */}
            <ul className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {knownTags.map((tag) => (
                <li key={tag}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2 py-1 text-sm break-words hover:bg-surface-hover">
                    <input
                      type="checkbox"
                      checked={checkedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                    />
                    {tag}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        <Field
          label={t('editLink.tagsNewLabel')}
          htmlFor={`${fieldId}-new-tags`}
          hint={t('editLink.tagsHint')}
          hintId={`${fieldId}-new-tags-hint`}
        >
          <input
            id={`${fieldId}-new-tags`}
            type="text"
            value={newTags}
            onChange={(event) => setNewTags(event.target.value)}
            aria-describedby={`${fieldId}-new-tags-hint`}
            className={INPUT_CLASSES}
          />
        </Field>
      </fieldset>

      <ChoiceOrNewField
        id={`${fieldId}-status`}
        label={t('dashboard.link.status')}
        choice={statusChoice}
        onChoose={setStatusChoice}
        options={[
          // The built-in status is the only translated one (§4).
          { value: BUILTIN_CHOICE, label: t('status.default') },
          ...knownStatuses.map((known) => ({ value: `${KNOWN_PREFIX}${known}`, label: known })),
        ]}
        newOptionLabel={t('editLink.statusNew')}
        newValueLabel={t('editLink.statusNewLabel')}
        newValue={newStatus}
        onNewValue={setNewStatus}
      />

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
 * A dropdown of what exists, plus one entry that reveals a field for something
 * new. Category and status differ only in what they call things.
 *
 * The alternative — a text field with a `<datalist>` — types and picks in one
 * control, but the suggestions stay invisible until you start typing, so the
 * list you built up is easy to never discover.
 */
function ChoiceOrNewField({
  id,
  label,
  choice,
  onChoose,
  options,
  newOptionLabel,
  newValueLabel,
  newValue,
  onNewValue,
}: {
  id: string;
  label: string;
  choice: string;
  onChoose: (choice: string) => void;
  options: { value: string; label: string }[];
  newOptionLabel: string;
  newValueLabel: string;
  newValue: string;
  onNewValue: (value: string) => void;
}) {
  const newValueRef = useRef<HTMLInputElement>(null);

  // The field appears in response to the choice above it, so that is where
  // the user is looking and where the caret belongs.
  useEffect(() => {
    if (choice === NEW_CHOICE) {
      newValueRef.current?.focus();
    }
  }, [choice]);

  return (
    <>
      <Field label={label} htmlFor={id}>
        <select
          id={id}
          value={choice}
          onChange={(event) => onChoose(event.target.value)}
          className={INPUT_CLASSES}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}

          <option value={NEW_CHOICE}>{newOptionLabel}</option>
        </select>
      </Field>

      {choice === NEW_CHOICE && (
        <Field label={newValueLabel} htmlFor={`${id}-new`}>
          <input
            ref={newValueRef}
            id={`${id}-new`}
            type="text"
            value={newValue}
            onChange={(event) => onNewValue(event.target.value)}
            className={INPUT_CLASSES}
          />
        </Field>
      )}
    </>
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
 * A `<select>` can only carry a string, so the option values are prefixed to
 * keep the meanings apart. Without that, a category the user names "new" or a
 * status they name "builtin" would be read back as the sentinel instead of as
 * their own value — exactly the collision the tagged union in §4 rules out.
 */
const NONE_CHOICE = 'none';
const BUILTIN_CHOICE = 'builtin';
const KNOWN_PREFIX = 'known:';
const NEW_CHOICE = 'new';

function categoryToChoice(category: string | null): string {
  return category === null ? NONE_CHOICE : `${KNOWN_PREFIX}${category}`;
}

function choiceToCategory(choice: string, newCategory: string): string | null {
  if (choice === NEW_CHOICE) {
    // A blank name means no category; the model turns it into null.
    return newCategory;
  }

  return choice.startsWith(KNOWN_PREFIX) ? choice.slice(KNOWN_PREFIX.length) : null;
}

function statusToChoice(status: LinkStatus): string {
  return status.kind === 'builtin' ? BUILTIN_CHOICE : `${KNOWN_PREFIX}${status.label}`;
}

function choiceToStatus(choice: string, newStatus: string): LinkStatus {
  if (choice === NEW_CHOICE) {
    // An empty label falls back to the built-in status; the model enforces it.
    return { kind: 'custom', label: newStatus };
  }

  return choice.startsWith(KNOWN_PREFIX)
    ? { kind: 'custom', label: choice.slice(KNOWN_PREFIX.length) }
    : DEFAULT_STATUS;
}

function customLabelOf(status: LinkStatus): string | null {
  return status.kind === 'custom' ? status.label : null;
}

/** Adds a value to a list of suggestions unless it is already there. */
function including(known: string[], value: string | null): string[] {
  return value === null || known.includes(value) ? known : [...known, value];
}

function union(known: string[], values: string[]): string[] {
  return [...new Set([...known, ...values])];
}
