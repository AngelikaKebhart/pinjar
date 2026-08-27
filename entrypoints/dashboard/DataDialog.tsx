import { Dialog } from '@/src/components/Dialog';
import { useTranslation } from '@/src/i18n/context';
import { DataSection } from './DataSection';

/**
 * Export, import and delete-all, behind an entry in the header's manage menu.
 *
 * Behind a menu rather than in a section below the list: the three are rare,
 * and the page is for reading the list, not for growing a longer scroll between
 * the user and the last saved link.
 *
 * Everything about being a modal is `Dialog`'s business; what is left here is
 * which heading it carries and what is inside it.
 */
export function DataDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('data.heading')}>
      <DataSection />
    </Dialog>
  );
}
