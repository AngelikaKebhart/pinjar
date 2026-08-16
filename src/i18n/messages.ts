import de from './de.json';
import en from './en.json';

export const LANGUAGES = ['de', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

/** What the user picked: a fixed language, or "follow the browser". */
export type LanguagePreference = Language | 'auto';

export type MessageCatalog = Record<string, string>;

export const CATALOGS: Record<Language, MessageCatalog> = { de, en };

/**
 * Plural forms are expressed as separate keys with a `_<category>` suffix, e.g.
 * `dashboard.savedLinks.count_one` and `…_other`. The categories are the ones
 * `Intl.PluralRules` returns, so adding a language with more forms than German
 * and English needs no code change — only more keys.
 *
 * Underscores are therefore reserved for this purpose; regular key segments are
 * separated by dots.
 */
export const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

type PluralSuffix = (typeof PLURAL_SUFFIXES)[number];

/** The English catalog is the reference; a test enforces that German matches it. */
type CatalogKey = keyof typeof en & string;

type PluralVariantKey = Extract<CatalogKey, `${string}_${PluralSuffix}`>;

/** Keys usable with `t()` — every key that is not one half of a plural pair. */
export type MessageKey = Exclude<CatalogKey, PluralVariantKey>;

// Distributes over the union because K is a naked type parameter.
type PluralBase<K> = K extends `${infer Base}_other` ? Base : never;

/** Keys usable with `plural()` — the shared prefix of a plural pair. */
export type PluralMessageKey = PluralBase<Extract<CatalogKey, `${string}_other`>>;
