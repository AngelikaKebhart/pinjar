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
 * The mark stays taller than the 36px icon buttons in both sizes. That gap is
 * the whole reason the lockup reads as a lockup: matched in size it becomes
 * one more button in the row, and the extension loses its name. Compact keeps
 * 4px of it rather than the full size's 8px — enough at this scale, and it
 * lets the wordmark come down a step without the mark towering over it.
 *
 * The divider sits closer to the row when compact, because the popup adds its
 * own `gap-4` underneath: at `pb-4` the line would float in 32px of nothing.
 */
const SIZES: Record<AppHeaderSize, { mark: string; title: string; divider: string }> = {
  full: { mark: 'h-11 w-11', title: 'text-3xl', divider: 'pb-4' },
  compact: { mark: 'h-10 w-10', title: 'text-2xl', divider: 'pb-3' },
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
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {children}
        </div>
      </div>

      {description !== undefined && <p className="mt-3 text-sm text-ink-muted">{description}</p>}
    </header>
  );
}
