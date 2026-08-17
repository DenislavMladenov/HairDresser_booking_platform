import { Card, CardHeader } from '../../components/ui/Card';
import { QueryState } from '../../components/ui/QueryState';
import { useDayAvailability } from '../../hooks/use-booking-data';
import { formatDateLong } from '../../lib/format';

interface TimeStepProps {
  serviceId: string;
  date: string;
  selected: string | null;
  onSelect: (slot: { startTime: string; label: string }) => void;
}

export function TimeStep({ serviceId, date, selected, onSelect }: TimeStepProps) {
  const availability = useDayAvailability(serviceId, date);
  const slots = availability.data?.slots ?? [];

  return (
    <Card>
      <CardHeader title="Choose a time" description={formatDateLong(date)} />

      <QueryState
        isLoading={availability.isPending}
        error={availability.error}
        isEmpty={slots.length === 0}
        emptyMessage="No free times left on this day. Please pick another day."
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots.map((slot) => {
            const isSelected = selected === slot.startTime;

            return (
              <button
                key={slot.startTime}
                type="button"
                onClick={() => onSelect({ startTime: slot.startTime, label: slot.label })}
                aria-pressed={isSelected}
                className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  isSelected ? 'bg-brand-600 text-white' : 'ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </QueryState>
    </Card>
  );
}
