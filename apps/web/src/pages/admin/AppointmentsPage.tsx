import { useState } from 'react';
import { BOOKING_STATUSES, type AdminBooking, type BookingStatus } from '@booking/shared';
import { BookingCard } from '../../components/admin/BookingCard';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { QueryState } from '../../components/ui/QueryState';
import { useTranslation } from '../../i18n/language-context-core';
import { sortByStart, useAdminBookings, useBookingActions } from '../../hooks/use-admin';
import { addDays, todayIsoDate } from '../../lib/format';
import { BookingEditor } from './BookingEditor';
import { ManualBookingForm } from './ManualBookingForm';

export function AppointmentsPage() {
  const { t } = useTranslation();
  const [from, setFrom] = useState(todayIsoDate());
  const [to, setTo] = useState(addDays(todayIsoDate(), 30));
  const [statuses, setStatuses] = useState<BookingStatus[]>([]);
  const [editing, setEditing] = useState<AdminBooking | null>(null);
  const [creating, setCreating] = useState(false);

  const actions = useBookingActions();
  const bookings = useAdminBookings({
    from: `${from}T00:00:00.000Z`,
    to: `${addDays(to, 1)}T00:00:00.000Z`,
    ...(statuses.length > 0 ? { status: statuses } : {}),
    take: 200,
  });

  function toggleStatus(status: BookingStatus): void {
    setStatuses((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
    );
  }

  const items = sortByStart(bookings.data?.items ?? []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t.admin.appointments.title}
          description={t.admin.appointments.description}
          action={
            <Button onClick={() => setCreating(true)}>{t.admin.appointments.addAppointment}</Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.appointments.fromLabel} htmlFor="from">
            <TextInput
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label={t.admin.appointments.toLabel} htmlFor="to">
            <TextInput
              id="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {BOOKING_STATUSES.map((status) => {
            const isActive = statuses.includes(status);

            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.status[status]}
              </button>
            );
          })}
          {statuses.length > 0 ? (
            <button
              type="button"
              onClick={() => setStatuses([])}
              className="px-2 py-1 text-xs text-slate-500 underline"
            >
              {t.admin.appointments.clear}
            </button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t.admin.appointments.resultsTitle}
          action={
            <span className="text-sm text-slate-600">
              {t.admin.appointments.found(bookings.data?.total ?? 0)}
            </span>
          }
        />

        <QueryState
          isLoading={bookings.isPending}
          error={bookings.error}
          isEmpty={items.length === 0}
          emptyMessage={t.admin.appointments.empty}
        >
          <ul className="space-y-3">
            {items.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={actions}
                showDate
                onEdit={setEditing}
              />
            ))}
          </ul>
        </QueryState>
      </Card>

      {editing ? (
        <BookingEditor booking={editing} actions={actions} onClose={() => setEditing(null)} />
      ) : null}

      {creating ? <ManualBookingForm actions={actions} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
