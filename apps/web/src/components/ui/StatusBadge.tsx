import type { BookingStatus } from '@booking/shared';
import { STATUS_LABELS, STATUS_STYLES } from '../../lib/booking-status';

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
