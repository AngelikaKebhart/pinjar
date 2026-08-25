import { JarMark } from '@/src/components/JarMark';
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/src/components/ThemeSwitcher';
import { useTranslation } from '@/src/i18n/context';
import { DataDialog } from './DataDialog';

/**
 * The bar across the top: the mark and the wordmark on one side, the three
 * things that are not about a single saved link on the other.
 *
 * Language, appearance and the data file used to be sections at the foot of
 * the page. They are settings, not content — putting them up here gives the
 * list the whole page and puts them where a browser interface is looked for
 * anyway. Each is an icon button carrying its name in text, so the row stays
 * this narrow without the icons having to be self-explanatory.
 */
export function DashboardHeader() {
  const { t } = useTranslation();

  return (
    <header>
      <div className="flex items-center justify-between gap-4 border-b-2 border-brand pb-4">
        {/*
          The lockup outweighs the controls next to it, rather than merely
          fitting beside them: the mark is a head taller than the buttons and
          the wordmark is set at heading size. Matched in size they read as
          four buttons in a row, and the extension loses its name.
        */}
        <div className="flex min-w-0 items-center gap-3">
          <JarMark className="h-11 w-11 shrink-0" />
          <h1 className="truncate text-3xl font-semibold text-brand">{t('dashboard.title')}</h1>
        </div>

        {/* Ordered as they are reached for: often, rarely, hardly ever. */}
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <DataDialog />
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-muted">{t('dashboard.subtitle')}</p>
    </header>
  );
}
