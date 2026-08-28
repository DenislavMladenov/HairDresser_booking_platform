import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { QueryState } from '../../components/ui/QueryState';
import { useAvailabilityCalendar } from '../../hooks/use-booking-data';
import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  formatDayOfMonth,
  formatMonthYear,
  isToday,
  mondayIndex,
  startOfMonth,
} from '../../lib/format';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DateStepProps {
  serviceId: string;
  from: string;
  selected: string | null;
  onSelect: (date: string) => void;
}

/**
 * A real month grid rather than a scrolling strip, so a free day reads in
 * context of the rest of its week. Days come from the calendar endpoint, so a
 * day the shop is closed or fully booked is visibly unselectable rather than a
 * dead end. Only the visible month is fetched, one request at a time.
 */
export function DateStep({ serviceId, from, selected, onSelect }: DateStepProps) {
  const earliestMonth = startOfMonth(from);
  const [monthStart, setMonthStart] = useState(earliestMonth);

  const rangeFrom = monthStart < from ? from : monthStart;
  const monthEnd = addDays(monthStart, daysInMonth(monthStart) - 1);
  const dayCount = daysBetween(rangeFrom, monthEnd) + 1;

  const calendar = useAvailabilityCalendar(serviceId, rangeFrom, dayCount);
  const availability = new Map(
    (calendar.data?.days ?? []).map((day) => [day.date, day.hasAvailability]),
  );

  const leadingBlanks = mondayIndex(monthStart);
  const cells = Array.from({ length: daysInMonth(monthStart) }, (_, index) =>
    addDays(monthStart, index),
  );
  const isEarliestMonth = monthStart <= earliestMonth;
  const hasAnyFreeDay = cells.some((date) => date >= from && (availability.get(date) ?? false));

  return (
    <Card>
      <CardHeader
        title="Choose a day"
        description={formatMonthYear(monthStart)}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isEarliestMonth}
              onClick={() => setMonthStart(addMonths(monthStart, -1))}
              aria-label="Previous month"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isEarliestMonth}
              onClick={() => setMonthStart(earliestMonth)}
            >
              This month
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMonthStart(addMonths(monthStart, 1))}
              aria-label="Next month"
            >
              Next
            </Button>
          </div>
        }
      />

      <QueryState isLoading={calendar.isPending} error={calendar.error}>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:gap-2 sm:text-xs">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}

          {cells.map((date) => {
            const isPast = date < from;
            const hasAvailability = !isPast && (availability.get(date) ?? false);
            const isSelected = selected === date;
            const today = isToday(date);

            return (
              <button
                key={date}
                type="button"
                disabled={!hasAvailability}
                onClick={() => onSelect(date)}
                aria-pressed={isSelected}
                aria-current={today ? 'date' : undefined}
                className={`aspect-square rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-brand-600 font-semibold text-white'
                    : hasAvailability
                      ? 'ring-1 ring-slate-200 hover:bg-slate-50'
                      : isPast
                        ? 'text-slate-300'
                        : 'cursor-not-allowed text-slate-300'
                } ${today && !isSelected ? 'ring-2 ring-brand-400' : ''}`}
              >
                {formatDayOfMonth(date)}
              </button>
            );
          })}
        </div>

        {!hasAnyFreeDay ? (
          <p className="mt-4 text-sm text-slate-500">
            No free days this month. Try the next one.
          </p>
        ) : null}
      </QueryState>
    </Card>
  );
}
