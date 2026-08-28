import { BookingStatus, type AdminBooking } from '@booking/shared';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { useTranslation } from '../../i18n/language-context-core';
import { formatDuration, formatMoney, formatTimeRange } from '../../lib/format';
import type { BookingActions } from '../../hooks/use-admin';

interface BookingCardProps {
  booking: AdminBooking;
  actions: BookingActions;
  /** Shown on lists that span several days. */
  showDate?: boolean;
  onEdit?: (booking: AdminBooking) => void;
}

/**
 * One appointment with the customer details the barber needs and only the
 * actions that are legal for its current status. The server enforces the same
 * rules, so a stale page cannot perform an invalid transition.
 */
export function BookingCard({ booking, actions, showDate = false, onEdit }: BookingCardProps) {
  const { t } = useTranslation();
  const isOpen =
    booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED;
  const busy =
    actions.confirm.isPending ||
    actions.cancel.isPending ||
    actions.complete.isPending ||
    actions.noShow.isPending;

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-slate-900">
              {formatTimeRange(booking.startTime, booking.endTime)}
            </p>
            <StatusBadge status={booking.status} />
          </div>

          {showDate ? (
            <p className="text-xs text-slate-500">{booking.startTime.slice(0, 10)}</p>
          ) : null}

          <p className="mt-1 truncate font-medium text-slate-800">{booking.customerName}</p>

          <p className="text-sm text-slate-600">
            <a href={`tel:${booking.customerPhone}`} className="text-brand-700 hover:underline">
              {booking.customerPhone}
            </a>
            {booking.customerEmail ? (
              <>
                {' · '}
                <a
                  href={`mailto:${booking.customerEmail}`}
                  className="text-brand-700 hover:underline"
                >
                  {booking.customerEmail}
                </a>
              </>
            ) : null}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {booking.service.name} · {formatDuration(booking.service.durationMinutes)} ·{' '}
            {formatMoney(booking.service.price, booking.service.currency)}
            {booking.createdByAdmin ? ` · ${t.shared.bookingCard.addedManually}` : ''}
          </p>

          {booking.notes ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {booking.notes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {booking.status === BookingStatus.PENDING ? (
            <Button size="sm" disabled={busy} onClick={() => actions.confirm.mutate(booking.id)}>
              {t.shared.bookingCard.confirm}
            </Button>
          ) : null}

          {isOpen ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => actions.complete.mutate(booking.id)}
              >
                {t.shared.bookingCard.done}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => actions.noShow.mutate(booking.id)}
              >
                {t.shared.bookingCard.noShow}
              </Button>
              {onEdit ? (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(booking)}>
                  {t.shared.bookingCard.edit}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => actions.cancel.mutate(booking.id)}
              >
                {t.shared.bookingCard.cancel}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
