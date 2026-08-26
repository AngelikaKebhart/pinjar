import type { ReactNode } from 'react';
import { JarMark } from '@/src/components/JarMark';
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/src/components/ThemeSwitcher';

/**
 * How much room the header has to fill.
 *
 * The dashboard gets a page to itself; the popup gets 352px of content width
 * and a 600px ceiling it shares with the list of saved links. Same lockup in
 * both, one step smaller in the narrow one — see the sizes below.
 */
export type AppHeaderSize = 'full' | 'compact';

/**
 * What changes between the two, and nothing else does.
 *
 * The mark is drawn taller than the buttons beside it in both sizes — 8px in
 * the full one, 4px when compact. That gap is why the lockup reads as a
 * lockup: matched in size it becomes one more button in the row, and the
 * extension loses its name. Keeping it is what forced the buttons down as well
 * as the mark, rather than only the mark.
 *
 * Compact takes every part of it down one step, because a bar that carries a
 * name is right at the top of a page and loud at the top of a 384px bubble,
 * where the tallest thing under it is a button of 14px text.
 *
 * `--control-size` is read by `IconButton`, four components down. **32px is a
 * deliberate stop short of the 24px floor** that WCAG 2.2 AA sets for pointer
 * targets (2.5.8), so the row keeps headroom rather than sitting on the
 * minimum. Do not take it lower to win a few more pixels.
 *
 * The divider sits closer to the row when compact, because the popup adds its
 * own `gap-4` underneath: at `pb-4` the line would float in 32px of nothing.
 */
const SIZES: Record<
  AppHeaderSize,
  { mark: string; title: string; divider: string; controls: string }
> = {
  full: {
    mark: 'h-11 w-11',
    title: 'text-3xl',
    divider: 'pb-4',
    controls: '[--control-size:2.25rem]',
  },
  compact: {
    mark: 'h-9 w-9',
    title: 'text-xl',
    divider: 'pb-2',
    controls: '[--control-size:2rem]',
  },
};

/**
 * The bar across the top of both interfaces: the mark and the wordmark on one
 * side, the settings that are not about a single saved link on the other.
 *
 * Language and appearance belong to every part of the extension, so they are
 * built in here rather than passed in. `children` is for what only one of the
 * two has — the dashboard's export/import/delete-all, which the popup
 * deliberately does not carry: a file picker or a download takes the focus,
 * and Chrome dismisses the popup the moment it loses it.
 */
export function AppHeader({
  title,
  description,
  size = 'full',
  children,
}: {
  /** The wordmark. Translated, though both catalogs say "PinJar". */
  title: string;
  /** One line under the divider, where the surface needs introducing. */
  description?: string;
  size?: AppHeaderSize;
  /** Extra controls, placed after language and appearance. */
  children?: ReactNode;
}) {
  const sizes = SIZES[size];

  return (
    <header>
      <div
        className={`flex items-center justify-between gap-4 border-b-2 border-brand ${sizes.divider}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <JarMark className={`${sizes.mark} shrink-0`} />
          <h1 className={`truncate font-semibold text-brand ${sizes.title}`}>{title}</h1>
        </div>

        {/* Ordered as they are reached for: often, rarely, hardly ever. */}
        <div className={`flex shrink-0 items-center gap-2 ${sizes.controls}`}>
          <LanguageSwitcher />
          <ThemeSwitcher />
          {children}
        </div>
      </div>

      {description !== undefined && <p className="mt-3 text-sm text-ink-muted">{description}</p>}
    </header>
  );
}
