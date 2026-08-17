import type { BookingConfirmation } from '@booking/shared';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDateTimeLong, formatDuration, formatTimeRange } from '../../lib/format';

interface SuccessStepProps {
  confirmation: BookingConfirmation;
  onBookAnother: () => void;
}

export function SuccessStep({ confirmation, onBookAnother }: SuccessStepProps) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
        ✓
      </div>

      <h2 className="mt-4 text-xl font-semibold text-slate-900">Your appointment is booked</h2>
      <p className="mt-1 text-slate-600">
        We look forward to seeing you. Please arrive a few minutes early.
      </p>

      <dl className="mt-6 space-y-2 rounded-lg bg-slate-50 p-4 text-left text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Service</dt>
          <dd className="font-medium text-slate-900">{confirmation.serviceName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">When</dt>
          <dd className="text-right font-medium text-slate-900">
            {formatDateTimeLong(confirmation.startTime, confirmation.timezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Time</dt>
          <dd className="font-medium text-slate-900">
            {formatTimeRange(confirmation.startTime, confirmation.endTime, confirmation.timezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Duration</dt>
          <dd className="font-medium text-slate-900">
            {formatDuration(confirmation.durationMinutes)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Reference</dt>
          <dd className="font-mono text-xs text-slate-700">
            {confirmation.id.slice(0, 8).toUpperCase()}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-slate-500">
        Need to change or cancel? Call the shop and quote your reference.
      </p>

      <div className="mt-6">
        <Button variant="secondary" onClick={onBookAnother}>
          Book another appointment
        </Button>
      </div>
    </Card>
  );
}
