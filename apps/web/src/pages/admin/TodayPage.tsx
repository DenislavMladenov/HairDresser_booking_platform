import { BookingStatus } from '@booking/shared';
import { BookingCard } from '../../components/admin/BookingCard';
import { Alert } from '../../components/ui/Alert';
import { Card, CardHeader } from '../../components/ui/Card';
import { QueryState } from '../../components/ui/QueryState';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
import { sortByStart, useAdminBookings, useBookingActions } from '../../hooks/use-admin';
import { formatDateLong, todayIsoDate } from '../../lib/format';

export function TodayPage() {
  const { t } = useTranslation();
  const today = todayIsoDate();
  const bookings = useAdminBookings({ date: today });
  const actions = useBookingActions();

  const items = sortByStart(bookings.data?.items ?? []);
  const active = items.filter(
    (booking) =>
      booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED,
  );
  const resolved = items.filter(
    (booking) =>
      booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED,
  );

  const failure = [
    actions.confirm.error,
    actions.cancel.error,
    actions.complete.error,
    actions.noShow.error,
  ].find(Boolean);
  const failureMessage = useApiErrorMessage(failure);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t.admin.today.title}
          description={formatDateLong(today)}
          action={
            <span className="text-sm text-slate-600">
              {t.admin.today.summary(active.length, items.length)}
            </span>
          }
        />

        {failure ? (
          <div className="mb-4">
            <Alert tone="error" title={t.admin.today.actionFailedTitle}>
              {failureMessage}
            </Alert>
          </div>
        ) : null}

        <QueryState
          isLoading={bookings.isPending}
          error={bookings.error}
          isEmpty={items.length === 0}
          emptyMessage={t.admin.today.empty}
        >
          <ul className="space-y-3">
            {active.map((booking) => (
              <BookingCard key={booking.id} booking={booking} actions={actions} />
            ))}
          </ul>

          {resolved.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-slate-500">
                {t.admin.today.finishedToday}
              </h3>
              <ul className="space-y-3 opacity-75">
                {resolved.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} actions={actions} />
                ))}
              </ul>
            </div>
          ) : null}
        </QueryState>
      </Card>
    </div>
  );
}
