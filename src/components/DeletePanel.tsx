import { useEffect, useId, useRef } from 'react';
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
      tabIndex={0}
    >
      <p id={questionId} className="text-sm font-bold break-words">
        {t('deleteLink.question', { title })}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onConfirm()}
          aria-label={t('deleteLink.confirmLabel', { title })}
          className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-on-danger hover:bg-danger-strong active:bg-danger-strong cursor-pointer"
        >
          {t('deleteLink.confirm')}
        </button>

        <button
          type="button"
          onClick={onCancel}
          aria-label={t('deleteLink.cancelLabel', { title })}
          className="rounded-control border border-line-strong px-4 py-2 text-sm font-bold text-ink hover:border-line hover:bg-surface-hover active:bg-surface cursor-pointer"
        >
          {t('deleteLink.cancel')}
        </button>
      </div>
    </div>
  );
}
