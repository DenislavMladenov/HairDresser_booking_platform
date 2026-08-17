import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { QueryState } from '../../components/ui/QueryState';
import { useAvailabilityCalendar } from '../../hooks/use-booking-data';
import { addDays, formatDayOfMonth, formatWeekdayName, isToday } from '../../lib/format';

const DAYS_PER_PAGE = 14;

interface DateStepProps {
  serviceId: string;
  from: string;
  selected: string | null;
  onSelect: (date: string) => void;
}

/**
 * Days are rendered from the calendar endpoint, so a day the shop is closed or
 * fully booked is visibly unselectable rather than a dead end.
 */
export function DateStep({ serviceId, from, selected, onSelect }: DateStepProps) {
  const [rangeStart, setRangeStart] = useState(from);
  const calendar = useAvailabilityCalendar(serviceId, rangeStart, DAYS_PER_PAGE);

  return (
    <Card>
      <CardHeader
        title="Choose a day"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={rangeStart <= from}
              onClick={() => setRangeStart(addDays(rangeStart, -DAYS_PER_PAGE))}
            >
              Earlier
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRangeStart(addDays(rangeStart, DAYS_PER_PAGE))}
            >
              Later
            </Button>
          </div>
        }
      />

      <QueryState isLoading={calendar.isPending} error={calendar.error}>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {(calendar.data?.days ?? []).map((day) => {
            const isSelected = selected === day.date;

            return (
              <button
                key={day.date}
                type="button"
                disabled={!day.hasAvailability}
                onClick={() => onSelect(day.date)}
                aria-pressed={isSelected}
                className={`rounded-lg px-1 py-2 text-center transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : day.hasAvailability
                      ? 'ring-1 ring-slate-200 hover:bg-slate-50'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                <span className="block text-xs uppercase">{formatWeekdayName(day.date)}</span>
                <span className="block text-lg font-semibold">{formatDayOfMonth(day.date)}</span>
                {isToday(day.date) ? <span className="block text-[10px]">today</span> : null}
              </button>
            );
          })}
        </div>

        {(calendar.data?.days ?? []).every((day) => !day.hasAvailability) ? (
          <p className="mt-4 text-sm text-slate-500">
            No free days in this period. Try looking further ahead.
          </p>
        ) : null}
      </QueryState>
    </Card>
  );
}
