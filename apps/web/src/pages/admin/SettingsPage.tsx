import { useState, type FormEvent } from 'react';
import type { BookingSettingsDto } from '@booking/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { QueryState } from '../../components/ui/QueryState';
import { useSettings, useUpdateSettings } from '../../hooks/use-admin';
import { ApiError } from '../../lib/api-client';

interface FormState {
  slotIntervalMinutes: string;
  minLeadTimeMinutes: string;
  maxAdvanceDays: string;
}

function toForm(settings: BookingSettingsDto): FormState {
  return {
    slotIntervalMinutes: String(settings.slotIntervalMinutes),
    minLeadTimeMinutes: String(settings.minLeadTimeMinutes),
    maxAdvanceDays: String(settings.maxAdvanceDays),
  };
}

export function SettingsPage() {
  const settings = useSettings();
  const save = useUpdateSettings();

  // The form is derived from server state until the barber edits something,
  // which avoids seeding state in an effect and the extra render that causes.
  const [draft, setDraft] = useState<FormState | null>(null);
  const form = draft ?? (settings.data ? toForm(settings.data) : null);

  function update(key: keyof FormState, value: string): void {
    if (!form) {
      return;
    }

    setDraft({ ...form, [key]: value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!form) {
      return;
    }

    save.mutate(
      {
        slotIntervalMinutes: Number(form.slotIntervalMinutes),
        minLeadTimeMinutes: Number(form.minLeadTimeMinutes),
        maxAdvanceDays: Number(form.maxAdvanceDays),
      },
      // Drop the draft so the saved server values become the source again.
      { onSuccess: () => setDraft(null) },
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Booking policy" description="Controls what customers can book" />

        {save.error ? (
          <div className="mb-4">
            <Alert
              tone="error"
              title="Could not save"
              details={save.error instanceof ApiError ? save.error.details : undefined}
            >
              {save.error instanceof ApiError ? save.error.message : 'Please try again.'}
            </Alert>
          </div>
        ) : null}

        {save.isSuccess && draft === null ? (
          <div className="mb-4">
            <Alert tone="success">Settings saved.</Alert>
          </div>
        ) : null}

        <QueryState isLoading={settings.isPending || form === null} error={settings.error}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Slot interval in minutes"
              htmlFor="slot-interval"
              required
              hint="Spacing between offered start times. 15 or 30 works well."
            >
              <TextInput
                id="slot-interval"
                type="number"
                required
                min={5}
                max={240}
                step={5}
                value={form?.slotIntervalMinutes ?? ''}
                onChange={(event) => update('slotIntervalMinutes', event.target.value)}
              />
            </Field>

            <Field
              label="Minimum notice in minutes"
              htmlFor="lead-time"
              required
              hint="How far ahead a customer must book. 60 means nothing within the next hour."
            >
              <TextInput
                id="lead-time"
                type="number"
                required
                min={0}
                max={10080}
                value={form?.minLeadTimeMinutes ?? ''}
                onChange={(event) => update('minLeadTimeMinutes', event.target.value)}
              />
            </Field>

            <Field
              label="Booking window in days"
              htmlFor="max-advance"
              required
              hint="How far into the future the calendar is open."
            >
              <TextInput
                id="max-advance"
                type="number"
                required
                min={1}
                max={365}
                value={form?.maxAdvanceDays ?? ''}
                onChange={(event) => update('maxAdvanceDays', event.target.value)}
              />
            </Field>

            <Button type="submit" loading={save.isPending}>
              Save settings
            </Button>
          </form>
        </QueryState>
      </Card>

      <Card>
        <CardHeader
          title="Deployment settings"
          description="These come from the server environment and cannot be changed here"
        />

        <QueryState isLoading={settings.isPending} error={settings.error}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Timezone</dt>
              <dd className="font-medium text-slate-900">{settings.data?.timezone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Currency</dt>
              <dd className="font-medium text-slate-900">{settings.data?.currency}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Changing the timezone would reinterpret appointments that are already booked, so it is
            set once at deployment time.
          </p>
        </QueryState>
      </Card>
    </div>
  );
}
