/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
import { useEffect, useId, useRef } from 'react';
import { Button } from '@/src/components/Button';
import { useTranslation } from '@/src/i18n/context';

export function DeletePanel({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const questionId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    groupRef.current?.focus();
  }, []);

  return (
    <div
      ref={groupRef}
      className="flex flex-col gap-3 rounded-card border border-danger p-4"
      role="group"
      aria-labelledby={questionId}
      // Intentionally focusable: focus is moved here when the delete
      // confirmation appears (WCAG 2.2 AA, 2.4.3).
      tabIndex={0}
    >
      <p id={questionId} className="text-sm font-bold break-words">
        {t('deleteLink.question', { title })}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          active
          onClick={() => void onConfirm()}
          aria-label={t('deleteLink.confirmLabel', { title })}
        >
          {t('deleteLink.confirm')}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          aria-label={t('deleteLink.cancelLabel', { title })}
        >
          {t('deleteLink.cancel')}
        </Button>
      </div>
    </div>
  );
}
