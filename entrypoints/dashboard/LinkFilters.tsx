import { useId, useMemo } from 'react';
import { Button } from '@/src/components/Button';
import { Select } from '@/src/components/Select';
import { useTranslation } from '@/src/i18n/context';
import {
  availableCategories,
  availableDomains,
  availableStatuses,
  availableTags,
  isFiltering,
  NO_FILTER,
  type LinkFilterCriteria,
} from '@/src/lib/filter';
import { statusToKey, type SavedLink } from '@/src/lib/saved-link';

/**
 * The controls above the list (see docs/concept.md §3.5).
 *
 * A bar above the list rather than a column beside it: it survives any window
 * width without a second layout, and it does not commit the dashboard to a
 * two-column shape before the design pass has had a say.
 *
 * The choices are derived from the saved links rather than from the stored
 * lists of values ever used, and each one accounts for the other filters. So
 * picking a category narrows the tags to those actually used in it, and no
 * option on offer can lead to an empty result.
 */
export function LinkFilters({
  links,
  criteria,
  onChange,
}: {
  /** Every saved link, unfiltered — the options are derived from these. */
  links: SavedLink[];
  criteria: LinkFilterCriteria;
  onChange: (criteria: LinkFilterCriteria) => void;
}) {
  const { t, compareNames } = useTranslation();
  const fieldId = useId();

  // Every list of choices is sorted by name, so a value keeps its place
  // instead of moving around with whichever link was saved last.
  const offeredCategories = useMemo(() => {
    const { names, uncategorised } = availableCategories(links, criteria);
    return { names: [...names].sort(compareNames), uncategorised };
  }, [links, criteria, compareNames]);

  const offeredTags = useMemo(
    () => [...availableTags(links, criteria)].sort(compareNames),
    [links, criteria, compareNames],
  );

  const offeredDomains = useMemo(
    () => [...availableDomains(links, criteria)].sort(compareNames),
    [links, criteria, compareNames],
  );

  // Sorted by the label actually shown, not by the stored status: the built-in
  // one is the only translated status (§4), so ordering it by its key would
  // put it somewhere else than where the user reads it.
  const offeredStatuses = useMemo(() => {
    const labelled = availableStatuses(links, criteria).map((status) => ({
      key: statusToKey(status),
      label: status.kind === 'builtin' ? t(`status.${status.key}`) : status.label,
    }));

    return labelled.sort((one, other) => compareNames(one.label, other.label));
  }, [links, criteria, compareNames, t]);

  const toggleTag = (tag: string) => {
    onChange({
      ...criteria,
      tags: criteria.tags.includes(tag)
        ? criteria.tags.filter((each) => each !== tag)
        : [...criteria.tags, tag],
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-tint p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${fieldId}-search`} className="text-sm font-bold">
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
          <label htmlFor={`${fieldId}-category`} className="text-sm font-bold">
            {t('dashboard.link.category')}
          </label>
          <Select
            id={`${fieldId}-category`}
            value={categoryToChoice(criteria.category)}
            onChange={(choice) => onChange({ ...criteria, category: choiceToCategory(choice) })}
          >
            <option value={ALL}>{t('filters.categoryAll')}</option>
            {offeredCategories.uncategorised && (
              <option value={NONE}>{t('filters.categoryNone')}</option>
            )}

            {offeredCategories.names.map((category) => (
              <option key={category} value={`${NAMED_PREFIX}${category}`}>
                {category}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <label htmlFor={`${fieldId}-status`} className="text-sm font-bold">
            {t('dashboard.link.status')}
          </label>
          <Select
            id={`${fieldId}-status`}
            value={criteria.status ?? ALL}
            onChange={(choice) => onChange({ ...criteria, status: choice === ALL ? null : choice })}
          >
            <option value={ALL}>{t('filters.statusAll')}</option>

            {offeredStatuses.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <label htmlFor={`${fieldId}-domain`} className="text-sm font-bold">
            {t('dashboard.link.domain')}
          </label>
          <Select
            id={`${fieldId}-domain`}
            value={domainToChoice(criteria.domain)}
            onChange={(choice) => onChange({ ...criteria, domain: choiceToDomain(choice) })}
          >
            <option value={ALL}>{t('filters.domainAll')}</option>

            {offeredDomains.map((domain) => (
              <option key={domain} value={`${NAMED_PREFIX}${domain}`}>
                {domain}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {offeredTags.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold">{t('dashboard.link.tags')}</legend>

          <ul className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {offeredTags.map((tag) => (
              <li key={tag}>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm break-words hover:bg-surface-hover">
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
          <Button type="button" variant="primary" onClick={() => onChange(NO_FILTER)}>
            {t('filters.reset')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The category and domain options.
 *
 * Real names are prefixed so a category the user actually calls "all" or
 * "none" — or a single-label hostname that happens to be `all` — is still
 * read back as itself rather than as one of the collective entries. The
 * status options need no such care: every key from `statusToKey` carries a
 * `builtin:`/`custom:` prefix already, so none of them can equal `all`.
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

// Every saved link has a domain, so there is no "without one" entry to offer.
function domainToChoice(domain: string | null): string {
  return domain === null ? ALL : `${NAMED_PREFIX}${domain}`;
}

function choiceToDomain(choice: string): string | null {
  return choice === ALL ? null : choice.slice(NAMED_PREFIX.length);
}

/** The search field. The drop-downs bring their own, from `Select`. */
const CONTROL_CLASSES =
  'w-full rounded-field border border-line-strong bg-surface px-3 py-2 text-sm text-ink';
