import { useEffect, useId, useState } from 'react';
import { useTranslation } from '@/src/i18n/context';
import { isFiltering, NO_FILTER, type LinkFilterCriteria } from '@/src/lib/filter';
import { DEFAULT_STATUS, statusToKey } from '@/src/lib/saved-link';
import { categories, customStatuses, tags, type StoredList } from '@/src/lib/storage';

/**
 * The controls above the list (see docs/concept.md §3.5).
 *
 * A bar above the list rather than a column beside it: it survives any window
 * width without a second layout, and it does not commit the dashboard to a
 * two-column shape before the design pass has had a say.
 *
 * The choices offered are the values actually in use, read from the same
 * stored lists the edit form fills. Offering a category nothing carries would
 * only ever produce an empty list.
 */
export function LinkFilters({
  criteria,
  onChange,
}: {
  criteria: LinkFilterCriteria;
  onChange: (criteria: LinkFilterCriteria) => void;
}) {
  const { t } = useTranslation();
  const fieldId = useId();

  const knownCategories = useStoredList(categories);
  const knownTags = useStoredList(tags);
  const knownStatuses = useStoredList(customStatuses);

  const toggleTag = (tag: string) => {
    onChange({
      ...criteria,
      tags: criteria.tags.includes(tag)
        ? criteria.tags.filter((each) => each !== tag)
        : [...criteria.tags, tag],
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-search`} className="text-sm font-medium">
          {t('filters.search')}
        </label>
        <p id={`${fieldId}-search-hint`} className="text-sm text-ink-muted">
          {t('filters.searchHint')}
        </p>
        {/*
          A search field, so the browser offers to clear it and announces it
          as one. Not type="text" with a magnifying glass drawn next to it.
        */}
        <input
          id={`${fieldId}-search`}
          type="search"
          value={criteria.search}
          onChange={(event) => onChange({ ...criteria, search: event.target.value })}
          aria-describedby={`${fieldId}-search-hint`}
          className={CONTROL_CLASSES}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <label htmlFor={`${fieldId}-category`} className="text-sm font-medium">
            {t('dashboard.link.category')}
          </label>
          <select
            id={`${fieldId}-category`}
            value={categoryToChoice(criteria.category)}
            onChange={(event) =>
              onChange({ ...criteria, category: choiceToCategory(event.target.value) })
            }
            className={CONTROL_CLASSES}
          >
            <option value={ALL}>{t('filters.categoryAll')}</option>
            <option value={NONE}>{t('filters.categoryNone')}</option>

            {knownCategories.map((category) => (
              <option key={category} value={`${NAMED_PREFIX}${category}`}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <label htmlFor={`${fieldId}-status`} className="text-sm font-medium">
            {t('dashboard.link.status')}
          </label>
          <select
            id={`${fieldId}-status`}
            value={criteria.status ?? ALL}
            onChange={(event) =>
              onChange({
                ...criteria,
                status: event.target.value === ALL ? null : event.target.value,
              })
            }
            className={CONTROL_CLASSES}
          >
            <option value={ALL}>{t('filters.statusAll')}</option>

            <option value={statusToKey(DEFAULT_STATUS)}>{t('status.default')}</option>

            {knownStatuses.map((label) => (
              <option key={label} value={statusToKey({ kind: 'custom', label })}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {knownTags.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t('dashboard.link.tags')}</legend>

          <ul className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {knownTags.map((tag) => (
              <li key={tag}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2 py-1 text-sm break-words hover:bg-surface-hover">
                  <input
                    type="checkbox"
                    checked={criteria.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  {tag}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {/*
        Only offered when there is something to reset — a button that does
        nothing is one the user has to think about every time they see it.
      */}
      {isFiltering(criteria) && (
        <div>
          <button
            type="button"
            onClick={() => onChange(NO_FILTER)}
            className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
          >
            {t('filters.reset')}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Reads a stored list and keeps watching it.
 *
 * Watching rather than reading once: the filter bar stays mounted while the
 * user edits a card below it, so a category added there has to reach the
 * dropdown without a reload. This is the same reason the list of links itself
 * is watched.
 */
function useStoredList(list: StoredList<string>): string[] {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    void list.getValue().then(setValues);

    return list.watch(setValues);
  }, [list]);

  return values;
}

/**
 * The category options.
 *
 * Real names are prefixed so a category the user actually calls "all" or
 * "none" is still read back as itself rather than as one of the two
 * collective entries. The status options need no such care: every key from
 * `statusToKey` carries a `builtin:`/`custom:` prefix already, so none of
 * them can equal `all`.
 */
const ALL = 'all';
const NONE = 'none';
const NAMED_PREFIX = 'named:';

function categoryToChoice(category: string | null): string {
  if (category === null) {
    return ALL;
  }

  return category === '' ? NONE : `${NAMED_PREFIX}${category}`;
}

function choiceToCategory(choice: string): string | null {
  if (choice === ALL) {
    return null;
  }

  // The empty string is what the filter reads as "without a category".
  return choice === NONE ? '' : choice.slice(NAMED_PREFIX.length);
}

const CONTROL_CLASSES =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink';
