import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { Button } from '@/src/components/Button';
import { Select } from '@/src/components/Select';
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
 * Adding something new happens in place, and Enter confirms it. That makes
 * Enter mean the same thing in all three: "take this entry", never "save the
 * whole form" — which is what an unhandled Enter in a text field would do.
 * The Save button stays the one way to finish.
 *
 * Everything here is a native form control with a real label. A custom widget
 * would have to re-earn keyboard operability, screen reader announcements and
 * the browser's own localization, and would almost certainly earn less.
 */
export function SavedLinkForm({
  id,
  link,
  onSave,
  onCancel,
  onDelete,
}: {
  /** Names the form, so the button that opened it can point at it. */
  id: string;
  link: {
    title: string;
    category: string | null;
    tags: string[];
    status: LinkStatus;
    note: string;
  };
  onSave: (edits: SavedLinkEdits) => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t, compareNames } = useTranslation();
  const fieldId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(link.title);
  const [note, setNote] = useState(link.note);

  const [categoryChoice, setCategoryChoice] = useState(() => categoryToChoice(link.category));
  const [statusChoice, setStatusChoice] = useState(() => statusToChoice(link.status));

  const [checkedTags, setCheckedTags] = useState<string[]>(link.tags);
  const [newTags, setNewTags] = useState('');

  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>(link.tags);
  const [knownStatuses, setKnownStatuses] = useState<string[]>([]);

  // Offered in the same order as the dashboard filters, so a value sits in the
  // same place whether it is being picked here or filtered by there.
  const offeredCategories = useMemo(
    () => [...knownCategories].sort(compareNames),
    [knownCategories, compareNames],
  );
  const offeredTags = useMemo(() => [...knownTags].sort(compareNames), [knownTags, compareNames]);

  // Sorted by the label, which for the built-in status is its translation
  // (§4) — that is what the user reads, and it puts the status in the same
  // place the filter does.
  const offeredStatuses = useMemo(() => {
    const options = [
      { value: BUILTIN_CHOICE, label: t('status.default') },
      ...knownStatuses.map((known) => ({ value: `${KNOWN_PREFIX}${known}`, label: known })),
    ];

    return options.sort((one, other) => compareNames(one.label, other.label));
  }, [knownStatuses, compareNames, t]);

  // Opening the form moves focus into it. The button that opened it stays
  // where it was, so this is a step forward into what just appeared rather
  // than a rescue from a control that vanished underneath the user.
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

  /** Turns what was typed into ticked boxes, ready for the next one. */
  const addTypedTags = () => {
    const added = splitTags(newTags);
    if (added.length === 0) {
      return;
    }

    setKnownTags((known) => union(known, added));
    setCheckedTags((checked) => union(checked, added));
    setNewTags('');
  };

  /*
   * Escape closes the form — the same key that dismisses the delete question
   * beside it, so there is one way out to learn rather than two.
   *
   * Only when nothing nearer has already claimed it: the fields for a new
   * category, status or tag use Escape to abandon what is being typed into
   * them, and they mark the event handled. Without that check a single press
   * would drop the entry and the whole form with it.
   *
   * A press outside the form deliberately does not close it. There is typed
   * text in here, and a stray click on the page behind must not be able to
   * throw it away — that is the one place where this form and the delete
   * question are allowed to behave differently.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    void onSave({
      title,
      category: choiceToCategory(categoryChoice),
      // Anything still sitting in the field counts too: pressing Save right
      // after typing a tag must not throw it away.
      tags: [...checkedTags, ...splitTags(newTags)],
      status: choiceToStatus(statusChoice),
      note,
    });
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the rule guards against a plain element made clickable; this one only listens for Escape, and everything inside it is a real control
    <form
      id={id}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
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
        value={categoryChoice}
        onChange={setCategoryChoice}
        options={[
          { value: NONE_CHOICE, label: t('editLink.categoryNone') },
          ...offeredCategories.map((known) => ({ value: `${KNOWN_PREFIX}${known}`, label: known })),
        ]}
        newOptionLabel={t('editLink.categoryNew')}
        onAdd={(name) => {
          setKnownCategories((known) => including(known, name));
          setCategoryChoice(`${KNOWN_PREFIX}${name}`);
        }}
      />

      <fieldset className="flex flex-col gap-2 rounded-card border border-line p-4">
        {/*
          A fieldset with a legend, because the tick boxes and the field for
          new ones only make sense together — a screen reader announces the
          group name with every one of them.
        */}
        <legend className="px-1 text-sm font-bold">{t('dashboard.link.tags')}</legend>

        {knownTags.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('editLink.tagsNone')}</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">{t('editLink.tagsKnown')}</p>

            {/*
              Tick boxes rather than a multi-select: picking several is one
              click each instead of a modifier key, and the current selection
              stays readable at a glance.
            */}
            <ul className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {offeredTags.map((tag) => (
                <li key={tag}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm break-words hover:bg-surface-hover">
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
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                // Without this, Enter would save the whole form.
                event.preventDefault();
                addTypedTags();
              }
            }}
            aria-describedby={`${fieldId}-new-tags-hint`}
            className={INPUT_CLASSES}
          />
        </Field>
      </fieldset>

      <ChoiceOrNewField
        id={`${fieldId}-status`}
        label={t('dashboard.link.status')}
        value={statusChoice}
        onChange={setStatusChoice}
        options={offeredStatuses}
        newOptionLabel={t('editLink.statusNew')}
        onAdd={(label) => {
          setKnownStatuses((known) => including(known, label));
          setStatusChoice(`${KNOWN_PREFIX}${label}`);
        }}
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
        <Button type="submit" variant="primary">
          {t('editLink.save')}
        </Button>

        <Button type="button" variant="outline" onClick={onCancel}>
          {t('editLink.cancel')}
        </Button>

        {onDelete && (
          <Button type="button" variant="outline-danger" onClick={onDelete}>
            {t('editLink.delete')}
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * A dropdown of what exists, with one entry that turns it into a text field
 * for something new. Category and status differ only in what they call things.
 *
 * The field takes the place of the dropdown rather than appearing below it:
 * the answer belongs where the question was asked, and nothing on the card
 * jumps around while being answered.
 *
 * Enter takes the entry, Escape abandons it, and leaving the field takes it
 * too — typing a name and clicking elsewhere must not silently discard it.
 * Either way focus returns to the dropdown, so tabbing carries on where it
 * left off.
 */
function ChoiceOrNewField({
  id,
  label,
  value,
  onChange,
  options,
  newOptionLabel,
  onAdd,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  newOptionLabel: string;
  onAdd: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const isAdding = draft !== null;
  const selectRef = useRef<HTMLSelectElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  // Focus only goes back to the dropdown when the user was actually in the
  // field, never on the first render.
  const wasAdding = useRef(false);

  useEffect(() => {
    if (isAdding) {
      draftRef.current?.focus();
    } else if (wasAdding.current) {
      selectRef.current?.focus();
    }

    wasAdding.current = isAdding;
  }, [isAdding]);

  const confirm = () => {
    const name = (draft ?? '').trim();
    if (name !== '') {
      onAdd(name);
    }

    // A blank entry simply leaves the previous choice in place, which is what
    // the dropdown still shows — it was never switched to the "new" option.
    setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Without this, Enter would save the whole form.
      event.preventDefault();
      confirm();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(null);
    }
  };

  if (isAdding) {
    return (
      <Field label={label} htmlFor={id} hint={t('editLink.newHint')} hintId={`${id}-hint`}>
        <input
          ref={draftRef}
          id={id}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirm}
          aria-describedby={`${id}-hint`}
          className={INPUT_CLASSES}
        />
      </Field>
    );
  }

  return (
    <Field label={label} htmlFor={id}>
      <Select
        ref={selectRef}
        id={id}
        value={value}
        onChange={(choice) => {
          if (choice === NEW_CHOICE) {
            setDraft('');
          } else {
            onChange(choice);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}

        <option value={NEW_CHOICE}>{newOptionLabel}</option>
      </Select>
    </Field>
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
      <label htmlFor={htmlFor} className="text-sm font-bold">
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
  'w-full rounded-field border border-line-strong bg-surface px-3 py-2 text-sm text-ink';

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

function choiceToCategory(choice: string): string | null {
  return choice.startsWith(KNOWN_PREFIX) ? choice.slice(KNOWN_PREFIX.length) : null;
}

function statusToChoice(status: LinkStatus): string {
  return status.kind === 'builtin' ? BUILTIN_CHOICE : `${KNOWN_PREFIX}${status.label}`;
}

function choiceToStatus(choice: string): LinkStatus {
  return choice.startsWith(KNOWN_PREFIX)
    ? { kind: 'custom', label: choice.slice(KNOWN_PREFIX.length) }
    : DEFAULT_STATUS;
}

/**
 * Splits what was typed into usable tags.
 *
 * The model normalizes again before storing; this exists because tick boxes
 * need a clean label the moment they appear, not once they are saved.
 */
function splitTags(typed: string): string[] {
  return typed
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
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
