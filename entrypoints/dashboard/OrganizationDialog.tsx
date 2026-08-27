import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { ActionFeedback, type FeedbackMessage } from '@/src/components/ActionFeedback';
import { Button } from '@/src/components/Button';
import { ConfirmPanel } from '@/src/components/ConfirmPanel';
import { Dialog } from '@/src/components/Dialog';
import { IconButton } from '@/src/components/IconButton';
import { DeleteIcon, EditIcon } from '@/src/components/icons';
import { useButtonRegistry } from '@/src/components/useButtonRegistry';
import { useTranslation } from '@/src/i18n/context';
import type { OrganizationKind } from '@/src/lib/organization';
import {
  deleteOrganizationValue,
  deleteUnusedOrganizationValues,
  getOrganizationValues,
  renameOrganizationValue,
  watchStoredData,
  type OrganizationValue,
} from '@/src/lib/storage';

/**
 * Renaming and deleting the values links are organized by (docs/concept.md
 * §3.3) — one dialog, opened three times over: for categories, for tags and for
 * the user's own status labels.
 *
 * One component rather than three, for the same reason `src/lib/organization`
 * is one module: the three differ in what they are called and in what deleting
 * one does to a link, and in nothing else. Three copies would drift, and the
 * one that drifted would be the one nobody opened.
 *
 * Reached from the manage menu rather than from the form that offers the
 * values: the form is where a link is filed, and a list of everything ever
 * typed would bury the two fields it is really for.
 */
export function OrganizationDialog({
  kind,
  isOpen,
  onClose,
}: {
  kind: OrganizationKind;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, plural } = useTranslation();

  const [values, setValues] = useState<OrganizationValue[] | null>(null);

  const reload = useCallback(
    () => getOrganizationValues(kind).then(setValues),
    // The dialog is mounted three times over, one per kind, and each one reads
    // its own.
    [kind],
  );

  /*
   * Read while the dialog is open, and forgotten when it closes, so the next
   * opening shows what is there rather than what was there.
   *
   * Watched as well as read: the popup can save a link while this dialog is
   * open, and a value it invents belongs in the list rather than appearing only
   * the next time the dialog is opened.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void reload();

    const stopWatching = watchStoredData(() => void reload());

    return () => {
      stopWatching();
      setValues(null);
    };
  }, [isOpen, reload]);

  /*
   * The count is the heading, rather than a line under it: it is the first
   * thing the dialog is asked, and a heading answering it costs no row. Before
   * the list has arrived, and once it is empty, the plain name — "0 categories"
   * is a heading that has to be read twice, and the line below says it better.
   */
  const title =
    values === null || values.length === 0
      ? t(`organization.${kind}.heading`)
      : plural(`organization.${kind}.count`, values.length);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <OrganizationList kind={kind} values={values} onReload={reload} />
    </Dialog>
  );
}

/** Which panel is open, and on which row. */
interface OpenPanel {
  /** The value it belongs to, or `WHOLE_LIST` for the one over all of them. */
  value: string;
  mode: 'rename' | 'delete' | 'unused';
}

/**
 * Stands in for a row where the panel belongs to no single value. Safe as a
 * marker because no remembered value is the empty string: every one of them was
 * typed into a field that trims and rejects blanks.
 */
const WHOLE_LIST = '';

function OrganizationList({
  kind,
  values,
  onReload,
}: {
  kind: OrganizationKind;
  /** `null` until storage has answered; the dialog above owns the reading. */
  values: OrganizationValue[] | null;
  onReload: () => Promise<unknown>;
}) {
  const { t, plural, compareNames } = useTranslation();

  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel | null>(null);

  /**
   * Where focus goes once the changed list has been rendered. A ref rather than
   * state: nothing is drawn from it, and clearing it is not a reason to render
   * the list a second time.
   */
  const valueToFocus = useRef<string | null>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const [renameButtons, rememberRenameButton] = useButtonRegistry();
  const [deleteButtons, rememberDeleteButton] = useButtonRegistry();
  const unusedButton = useRef<HTMLButtonElement>(null);
  const unusedPanelId = useId();

  /*
   * A rename or a deletion takes the row that was being worked on off the
   * screen — a renamed row sorts elsewhere, a merged or deleted one is gone —
   * and focus would fall to the dialog with nothing saying why. Done here
   * rather than in the handler, because the button focus moves to only exists
   * once the new list has been rendered.
   */
  useEffect(() => {
    const target = valueToFocus.current;

    if (values === null || target === null) {
      return;
    }

    valueToFocus.current = null;
    (renameButtons.current.get(target) ?? summaryRef.current)?.focus();
    // `renameButtons` is a ref and never changes; the linter cannot see that
    // through the hook that hands it over.
  }, [values, renameButtons]);

  /** The button a panel was opened from, whether it belongs to a row or not. */
  const buttonFor = (value: string, mode: OpenPanel['mode']) => {
    if (mode === 'unused') {
      return unusedButton.current;
    }

    return (mode === 'rename' ? renameButtons : deleteButtons).current.get(value);
  };

  const togglePanel = (value: string, mode: OpenPanel['mode']) => {
    const isClosing = openPanel?.value === value && openPanel.mode === mode;

    setOpenPanel(isClosing ? null : { value, mode });

    /*
     * No button leaves when its panel closes — which is why they stay on screen
     * while it is open — so focus can go back straight away. The panel cannot
     * do this itself: it is where focus currently is, and it knows nothing
     * about the button that opened it.
     */
    if (isClosing) {
      buttonFor(value, mode)?.focus();
    }
  };

  /**
   * Runs a change, says what it did, and puts focus back where the user was.
   * The list is re-read here rather than left to the watcher above, so that the
   * render focus depends on cannot arrive after the focus does.
   */
  const applyChange = async (change: () => Promise<FeedbackMessage | null>, focusOn: string) => {
    const message = await change();

    valueToFocus.current = focusOn;
    await onReload();
    setFeedback(message);
    setOpenPanel(null);
  };

  const handleRename = (from: string, to: string) =>
    applyChange(async () => {
      const outcome = await renameOrganizationValue(kind, from, to);

      // Nothing happened: the value went while the field was open, which the
      // refreshed list says better than a sentence about it would.
      if (outcome === null) {
        return null;
      }

      return {
        key: outcome.merged ? 'organization.feedback.merged' : 'organization.feedback.renamed',
        params: { from, to },
      };
    }, to);

  const handleDelete = (value: string, usage: number, neighbour: string | null) =>
    applyChange(async () => {
      await deleteOrganizationValue(kind, value);

      return {
        key: usage > 0 ? 'organization.feedback.deletedInUse' : 'organization.feedback.deleted',
        params: { value },
      };
      // No neighbour left means the list is empty, and focus falls to the line
      // that now says so.
    }, neighbour ?? '');

  /**
   * Forgets everything on no saved link at all. Nothing on a link changes, so
   * unlike the deletion above this needs no word about what survives it — the
   * question names what goes and its hint says the rest.
   */
  const handleRemoveUnused = () =>
    applyChange(
      async () => ({
        key: `organization.feedback.unusedRemoved.${kind}` as const,
        count: await deleteUnusedOrganizationValues(kind),
      }),
      // The button asking the question goes with the last unused value, so
      // focus falls to the line that now says how many are left.
      WHOLE_LIST,
    );

  // Nothing can be said about the list before it is known, and a count that
  // flicked from nothing to twenty-seven would be read out twice.
  if (values === null) {
    return null;
  }

  const shown = [...values].sort((one, other) => compareNames(one.value, other.value));
  const unused = shown.filter((value) => value.usage === 0);
  const isRemovingUnused = openPanel?.mode === 'unused';

  return (
    <div className="flex flex-col gap-4">
      {/*
        What this dialog is for, in one line — the heading above carries how
        many there are. Plain text, not a live region: it does not change, and
        what does change is announced by the feedback below.

        Also where focus lands when the row it was on has gone (see above),
        which is why it stays one element in both states rather than two.
      */}
      <p ref={summaryRef} tabIndex={-1} className="text-sm text-ink-muted">
        {t(shown.length === 0 ? `organization.${kind}.empty` : `organization.${kind}.help`)}
      </p>

      {/*
        Offered only while there is something to remove, and named after what
        that is: "Remove unused" alone would be one more thing to work out in a
        dialog that already asks the user to keep three kinds apart (2.4.6).
      */}
      {unused.length > 0 && (
        <Button
          ref={unusedButton}
          variant="outline"
          className="self-start"
          expanded={isRemovingUnused}
          controls={unusedPanelId}
          onClick={() => togglePanel(WHOLE_LIST, 'unused')}
        >
          {t(`organization.unused.action.${kind}`)}
        </Button>
      )}

      {isRemovingUnused && (
        <ConfirmPanel
          id={unusedPanelId}
          question={plural(`organization.unused.question.${kind}`, unused.length)}
          /*
            Named one by one rather than counted: a category outlives its last
            link precisely because it may be wanted again, and "remove 3 unused
            categories" is not enough to know whether one of them is the one
            being kept for next time (3.3.4).
          */
          details={
            <>
              <p className="text-sm font-medium">{t('organization.unused.list')}</p>
              <ul className="mt-1 list-disc pl-5 text-sm break-words">
                {unused.map((value) => (
                  <li key={value.value}>{value.value}</li>
                ))}
              </ul>
            </>
          }
          hint={t('organization.unused.hint')}
          confirm={t('organization.unused.confirm')}
          cancel={t('organization.unused.cancel')}
          onConfirm={handleRemoveUnused}
          onCancel={() => togglePanel(WHOLE_LIST, 'unused')}
        />
      )}

      <ActionFeedback message={feedback} />

      {shown.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shown.map((value, position) => (
            <ValueRow
              key={value.value}
              kind={kind}
              value={value}
              knownValues={shown.map((each) => each.value)}
              openPanel={openPanel}
              onToggle={togglePanel}
              rememberRenameButton={rememberRenameButton}
              rememberDeleteButton={rememberDeleteButton}
              onRename={handleRename}
              onDelete={() =>
                handleDelete(
                  value.value,
                  value.usage,
                  (shown[position + 1] ?? shown[position - 1])?.value ?? null,
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One remembered value: what it is called, what still hangs on it, and the two
 * buttons that change that.
 *
 * Both buttons are disclosures with the same contract as the ones on a saved
 * link: press to open, press again to close, Escape closes, focus comes back
 * either way. Each says which value it acts on, because "Rename" on its own
 * says nothing when a list of thirty is read out one after another (WCAG 2.2
 * AA, 2.4.6).
 *
 * The usage count sits under the name rather than beside it: in German these
 * are long enough that a single line would break either the name or the count
 * character by character once the dialog is narrow (1.4.10).
 */
function ValueRow({
  kind,
  value,
  knownValues,
  openPanel,
  onToggle,
  rememberRenameButton,
  rememberDeleteButton,
  onRename,
  onDelete,
}: {
  kind: OrganizationKind;
  value: OrganizationValue;
  /** Every name in the list, so a rename onto one of them can be asked about. */
  knownValues: string[];
  openPanel: OpenPanel | null;
  onToggle: (value: string, mode: OpenPanel['mode']) => void;
  rememberRenameButton: (value: string, button: HTMLButtonElement | null) => void;
  rememberDeleteButton: (value: string, button: HTMLButtonElement | null) => void;
  onRename: (from: string, to: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const { t, plural } = useTranslation();
  const formId = useId();
  const questionId = useId();

  const isRenaming = openPanel?.value === value.value && openPanel.mode === 'rename';
  const isDeleting = openPanel?.value === value.value && openPanel.mode === 'delete';

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line p-3">
      {/*
        The buttons keep to the right edge at every width; the floor under the
        name lets them drop to a line of their own rather than squeeze it.
      */}
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-32 flex-1">
          <p className="text-sm font-medium break-words">{value.value}</p>
          <p className="text-sm text-ink-muted">
            {value.usage === 0
              ? t('organization.usage.none')
              : plural('organization.usage', value.usage)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <IconButton
            ref={(button) => rememberRenameButton(value.value, button)}
            label={t('organization.rename.actionLabel', { value: value.value })}
            expanded={isRenaming}
            controls={formId}
            onClick={() => onToggle(value.value, 'rename')}
          >
            <EditIcon />
          </IconButton>

          <IconButton
            ref={(button) => rememberDeleteButton(value.value, button)}
            label={t('organization.delete.actionLabel', { value: value.value })}
            expanded={isDeleting}
            controls={questionId}
            onClick={() => onToggle(value.value, 'delete')}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </div>

      {isRenaming && (
        <RenameForm
          id={formId}
          value={value.value}
          knownValues={knownValues}
          onRename={(name) => onRename(value.value, name)}
          onCancel={() => onToggle(value.value, 'rename')}
        />
      )}

      {isDeleting && (
        <ConfirmPanel
          id={questionId}
          question={t(`organization.delete.question.${kind}`, { value: value.value })}
          /*
            The hint is the whole point of asking: what goes is the value, not
            what was filed under it, and that is the fear worth answering before
            the button is pressed (3.3.4).
          */
          hint={t(`organization.delete.hint.${kind}`, { fallback: t('status.default') })}
          confirm={t('organization.delete.confirm')}
          confirmLabel={t('organization.delete.confirmLabel', { value: value.value })}
          cancel={t('organization.delete.cancel')}
          cancelLabel={t('organization.delete.cancelLabel', { value: value.value })}
          onConfirm={onDelete}
          onCancel={() => onToggle(value.value, 'delete')}
        />
      )}
    </li>
  );
}

/**
 * The field a value is renamed in, and the question asked when the new name is
 * one that already exists.
 *
 * Renaming onto an existing name merges the two rather than being refused —
 * that is what a rename means when it collides, the same thing having been
 * typed twice, once with a slip. It is still not something anyone does by
 * accident without noticing, so it is asked about first (WCAG 2.2 AA, 3.3.4):
 * a second value is about to change with it, and nothing brings the two apart
 * again.
 *
 * A blank name, or the name it already has, closes the field rather than
 * reporting an error — neither is a mistake to explain, only a change of mind.
 */
function RenameForm({
  id,
  value,
  knownValues,
  onRename,
  onCancel,
}: {
  id: string;
  value: string;
  knownValues: string[];
  onRename: (name: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();
  const questionId = useId();

  const [name, setName] = useState(value);
  /** The existing name this is about to be merged into, once asked about. */
  const [mergeInto, setMergeInto] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  // The field is what the button opened, so it is where focus belongs (2.4.3).
  // Selected rather than merely focused: a rename usually replaces the name
  // rather than adding to it.
  useEffect(() => {
    fieldRef.current?.select();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const next = name.trim();

    if (next === '' || next === value) {
      onCancel();
    } else if (knownValues.includes(next)) {
      setMergeInto(next);
    } else {
      void onRename(next);
    }
  };

  /*
   * Escape leaves the field, the same key that closes the panels beside it.
   * While the merge question is up the key belongs to that question, which
   * cancels back to the field rather than out of the rename altogether.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !event.defaultPrevented && mergeInto === null) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the rule guards against a plain element made clickable; this one only listens for Escape, and everything inside it is a real control
    <form id={id} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {/* A real label, not a placeholder that leaves as soon as there is
            something in the field (3.3.2). */}
        <label htmlFor={fieldId} className="text-sm font-bold">
          {t('organization.rename.label', { value })}
        </label>

        <input
          ref={fieldRef}
          id={fieldId}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-field border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          {t('organization.rename.save')}
        </Button>

        <Button type="button" variant="outline" onClick={onCancel}>
          {t('organization.rename.cancel')}
        </Button>
      </div>

      {mergeInto !== null && (
        <ConfirmPanel
          id={questionId}
          question={t('organization.rename.merge.question', { to: mergeInto })}
          hint={t('organization.rename.merge.hint', { from: value, to: mergeInto })}
          confirm={t('organization.rename.merge.confirm')}
          cancel={t('organization.rename.merge.cancel')}
          onConfirm={() => onRename(mergeInto)}
          onCancel={() => {
            setMergeInto(null);
            fieldRef.current?.select();
          }}
        />
      )}
    </form>
  );
}
