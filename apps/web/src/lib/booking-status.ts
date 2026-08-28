import type { BookingStatus } from '@booking/shared';

/**
 * Presentation for booking statuses. The labels themselves live in the
 * translation dictionaries (`t.status`), since they are user-facing text.
 */
export const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-brand-100 text-brand-900',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  NO_SHOW: 'bg-red-100 text-red-800',
};
