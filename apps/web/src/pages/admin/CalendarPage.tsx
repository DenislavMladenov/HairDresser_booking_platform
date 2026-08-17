import { useState } from 'react';
import { BookingStatus, type AdminBooking } from '@booking/shared';
import { BookingCard } from '../../components/admin/BookingCard';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { QueryState } from '../../components/ui/QueryState';
import { sortByStart, useAdminBookings, useBookingActions } from '../../hooks/use-admin';
import {
  addDays,
  formatDateLong,
  formatDayOfMonth,
  formatWeekdayName,
  isToday,
  todayIsoDate,
} from '../../lib/format';
import { BookingEditor } from './BookingEditor';

/** Monday of the week containing the given date. */
function startOfWeek(isoDate: string): string {
  const weekday = new Date(`${isoDate}T12:00:00Z`).getUTCDay() || 7;
  return addDays(isoDate, -(weekday - 1));
}

export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayIsoDate()));
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [editing, setEditing] = useState<AdminBooking | null>(null);

  const actions = useBookingActions();
  const week = useAdminBookings({
    from: `${weekStart}T00:00:00.000Z`,
    to: `${addDays(weekStart, 7)}T00:00:00.000Z`,
    take: 500,
  });

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const items = sortByStart(week.data?.items ?? []);

  function countFor(date: string): number {
    return items.filter(
      (booking) =>
        booking.startTime.slice(0, 10) === date &&
        booking.status !== BookingStatus.CANCELLED,
    ).length;
  }

  const selectedItems = items.filter((booking) => booking.startTime.slice(0, 10) === selectedDate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Calendar"
          description="Pick a day to see its appointments"
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWeekStart(startOfWeek(todayIsoDate()))}
              >
                This week
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                Next
              </Button>
            </div>
          }
        />

        <QueryState isLoading={week.isPending} error={week.error}>
          <div className="grid grid-cols-7 gap-2">
            {days.map((date) => {
              const count = countFor(date);
              const isSelected = date === selectedDate;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-pressed={isSelected}
                  className={`rounded-lg px-1 py-2 text-center transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-xs uppercase">{formatWeekdayName(date)}</span>
                  <span className="block text-lg font-semibold">{formatDayOfMonth(date)}</span>
                  <span
                    className={`block text-[11px] ${isSelected ? 'text-brand-100' : 'text-slate-500'}`}
                  >
                    {count === 0 ? '-' : `${count} appt`}
                  </span>
                  {isToday(date) ? (
                    <span className="block text-[10px] font-medium">today</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </QueryState>
      </Card>

      <Card>
        <CardHeader title={formatDateLong(selectedDate)} />

        <QueryState
          isLoading={week.isPending}
          error={week.error}
          isEmpty={selectedItems.length === 0}
          emptyMessage="Nothing booked on this day."
        >
          <ul className="space-y-3">
            {selectedItems.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={actions}
                onEdit={setEditing}
              />
            ))}
          </ul>
        </QueryState>
      </Card>

      {editing ? (
        <BookingEditor booking={editing} actions={actions} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
