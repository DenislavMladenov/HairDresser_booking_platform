import type { BookingStatus } from '@booking/shared';
import { useTranslation } from '../../i18n/language-context-core';
import { STATUS_STYLES } from '../../lib/booking-status';

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {t.status[status]}
    </span>
  );
}
