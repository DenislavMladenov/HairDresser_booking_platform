import type { BookingStatus } from '@booking/shared';

/**
 * Presentation for booking statuses. Kept out of the component file so that
 * editing a label does not force a full reload during development.
 */
export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

export const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-brand-100 text-brand-900',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  NO_SHOW: 'bg-red-100 text-red-800',
};

export function statusLabel(status: BookingStatus): string {
  return STATUS_LABELS[status];
}
