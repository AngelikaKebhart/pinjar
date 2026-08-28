import { AppHeader } from '@/src/components/AppHeader';
import { useTranslation } from '@/src/i18n/context';
import { ManageMenu } from './ManageMenu';

/**
 * The dashboard's take on the shared header: the full-size lockup and one
 * control the popup does not get.
 *
 * Language, appearance and everything the manage menu leads to are settings and
 * chores rather than content, so they sit up here instead of in sections at the
 * foot of the page: the list gets the whole page, and they are where a browser
 * interface is looked for. Each is an icon button carrying its name in text, so
 * the row stays this narrow without the icons having to be self-explanatory.
 */
export function DashboardHeader() {
  const { t } = useTranslation();

  return (
    <AppHeader title={t('dashboard.title')}>
      <ManageMenu />
    </AppHeader>
  );
}
