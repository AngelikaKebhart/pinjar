import { AppHeader } from '@/src/components/AppHeader';
import { useTranslation } from '@/src/i18n/context';
import { DataDialog } from './DataDialog';

/**
 * The dashboard's take on the shared header: the full-size lockup, a line of
 * subtitle, and one control the popup does not get.
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
    <AppHeader title={t('dashboard.title')} description={t('dashboard.subtitle')}>
      <DataDialog />
    </AppHeader>
  );
}
