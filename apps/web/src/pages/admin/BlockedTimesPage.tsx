import { useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { QueryState } from '../../components/ui/QueryState';
import { useBlockedTimeMutations, useBlockedTimes } from '../../hooks/use-admin';
import { ApiError } from '../../lib/api-client';
import { BUSINESS_TIMEZONE, addDays, formatDateTimeLong, todayIsoDate } from '../../lib/format';

export function BlockedTimesPage() {
  const from = todayIsoDate();
  const blocked = useBlockedTimes(`${from}T00:00:00.000Z`, `${addDays(from, 180)}T00:00:00.000Z`);
  const mutations = useBlockedTimeMutations();

  const [date, setDate] = useState(from);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('14:00');
  const [reason, setReason] = useState('');
  const [wholeDay, setWholeDay] = useState(false);
  const [needsForce, setNeedsForce] = useState(false);

  const activeMutation = wholeDay ? mutations.blockDay : mutations.create;

  function submit(force: boolean): void {
    const onSuccess = () => {
      setReason('');
      setNeedsForce(false);
    };
    const onError = (error: unknown) => {
      // The API refuses to hide existing appointments unless told twice.
      if (error instanceof ApiError && error.status === 409) {
        setNeedsForce(true);
      }
    };

    if (wholeDay) {
      mutations.blockDay.mutate(
        { date, ...(reason.trim() ? { reason: reason.trim() } : {}), force },
        { onSuccess, onError },
      );
      return;
    }

    const start = DateTime.fromISO(`${date}T${startTime}`, { zone: BUSINESS_TIMEZONE })
      .toUTC()
      .toISO();
    const end = DateTime.fromISO(`${date}T${endTime}`, { zone: BUSINESS_TIMEZONE }).toUTC().toISO();

    if (!start || !end) {
      return;
    }

    mutations.create.mutate(
      {
        startTime: start,
        endTime: end,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        force,
      },
      { onSuccess, onError },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    submit(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Block time off"
          description="Holidays, appointments of your own, or a whole day closed"
        />

        {activeMutation.error ? (
          <div className="mb-4">
            <Alert
              tone={needsForce ? 'warning' : 'error'}
              title={needsForce ? 'This period already has appointments' : 'Could not block it'}
            >
              {activeMutation.error instanceof ApiError
                ? activeMutation.error.message
                : 'Please try again.'}
              {needsForce ? (
                <div className="mt-3">
                  <Button size="sm" variant="danger" onClick={() => submit(true)}>
                    Block anyway
                  </Button>
                </div>
              ) : null}
            </Alert>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={wholeDay}
              onChange={(event) => setWholeDay(event.target.checked)}
              className="text-brand-600 focus:ring-brand-600 h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-800">Block the whole day</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="block-date" required>
              <TextInput
                id="block-date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>

            {!wholeDay ? (
              <>
                <Field label="From" htmlFor="block-start" required>
                  <TextInput
                    id="block-start"
                    type="time"
                    required
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </Field>
                <Field label="To" htmlFor="block-end" required>
                  <TextInput
                    id="block-end"
                    type="time"
                    required
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </Field>
              </>
            ) : null}
          </div>

          <Field label="Reason" htmlFor="block-reason" hint="Only you can see this.">
            <TextInput
              id="block-reason"
              value={reason}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>

          <Button type="submit" loading={activeMutation.isPending}>
            Block time
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Upcoming time off" />

        <QueryState
          isLoading={blocked.isPending}
          error={blocked.error}
          isEmpty={blocked.data?.length === 0}
          emptyMessage="No time off scheduled."
        >
          <ul className="divide-y divide-slate-100">
            {(blocked.data ?? []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {formatDateTimeLong(item.startTime)} to {formatDateTimeLong(item.endTime)}
                  </p>
                  {item.reason ? <p className="text-sm text-slate-500">{item.reason}</p> : null}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  loading={mutations.remove.isPending}
                  onClick={() => mutations.remove.mutate(item.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </QueryState>
      </Card>
    </div>
  );
}
