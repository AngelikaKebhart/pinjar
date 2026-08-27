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
import type { SavedLink } from '@/src/lib/saved-link';

/**
 * The controls above the list (docs/concept.md §3.5).
 *
 * A bar above the list rather than a column beside it: it survives any window
 * width without a second layout.
 *
 * The choices come from the saved links rather than the stored lists of every
 * value ever used, and each accounts for the other filters — so picking a
 * category narrows the tags to those used in it, and no option on offer can
 * lead to an empty result.
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

  // Sorted by name, so a value keeps its place instead of moving with
  // whichever link was saved last.
  const offeredCategories = useMemo(() => {
    const { names, unset } = availableCategories(links, criteria);
    return { names: [...names].sort(compareNames), unset };
  }, [links, criteria, compareNames]);

  const offeredTags = useMemo(
    () => [...availableTags(links, criteria)].sort(compareNames),
    [links, criteria, compareNames],
  );

  const offeredDomains = useMemo(
    () => [...availableDomains(links, criteria)].sort(compareNames),
    [links, criteria, compareNames],
  );

  const offeredStatuses = useMemo(() => {
    const { names, unset } = availableStatuses(links, criteria);
    return { names: [...names].sort(compareNames), unset };
  }, [links, criteria, compareNames]);

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
          A search field, so the browser offers to clear it and announces it as
          one — not type="text" with a magnifying glass drawn beside it.
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
            value={nameToChoice(criteria.category)}
            onChange={(choice) => onChange({ ...criteria, category: choiceToName(choice) })}
          >
            <option value={ALL}>{t('filters.categoryAll')}</option>
            {offeredCategories.unset && <option value={NONE}>{t('filters.categoryNone')}</option>}

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
            value={nameToChoice(criteria.status)}
            onChange={(choice) => onChange({ ...criteria, status: choiceToName(choice) })}
          >
            <option value={ALL}>{t('filters.statusAll')}</option>
            {offeredStatuses.unset && <option value={NONE}>{t('filters.statusNone')}</option>}

            {offeredStatuses.names.map((status) => (
              <option key={status} value={`${NAMED_PREFIX}${status}`}>
                {status}
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
                <label className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm break-words hover:bg-surface-hover">
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
        Always there, and dimmed while there is nothing to reset. Shown only
        when it had work to do, it appeared and vanished as filters were picked
        and cleared, shifting everything below it — and a control that is
        sometimes absent has to be looked for rather than remembered.

        `disabled` rather than a click that does nothing: it is what tells a
        screen reader the button is unavailable, and it takes the button out of
        the tab order so the keyboard is not walked through a dead stop.
      */}
      <div>
        <Button
          type="button"
          variant="primary"
          disabled={!isFiltering(criteria)}
          onClick={() => onChange(NO_FILTER)}
        >
          {t('filters.reset')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The options for every drop-down here. Real names are prefixed so a category
 * or status the user calls "all" or "none" — or a single-label hostname `all` —
 * is read back as itself rather than as a collective entry.
 */
const ALL = 'all';
const NONE = 'none';
const NAMED_PREFIX = 'named:';

/** The category and the status read the same way; only the domain differs. */
function nameToChoice(name: string | null): string {
  if (name === null) {
    return ALL;
  }

  return name === '' ? NONE : `${NAMED_PREFIX}${name}`;
}

function choiceToName(choice: string): string | null {
  if (choice === ALL) {
    return null;
  }

  // The empty string is what the filter reads as "without one".
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
