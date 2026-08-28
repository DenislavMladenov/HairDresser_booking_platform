import { useState, type FormEvent } from 'react';
import type { BookingSettingsDto } from '@booking/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { QueryState } from '../../components/ui/QueryState';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
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
  const { t } = useTranslation();
  const settings = useSettings();
  const save = useUpdateSettings();
  const saveErrorMessage = useApiErrorMessage(save.error);

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
        <CardHeader title={t.admin.settings.policyTitle} description={t.admin.settings.policyDescription} />

        {save.error ? (
          <div className="mb-4">
            <Alert
              tone="error"
              title={t.admin.settings.couldNotSave}
              details={save.error instanceof ApiError ? save.error.details : undefined}
            >
              {saveErrorMessage}
            </Alert>
          </div>
        ) : null}

        {save.isSuccess && draft === null ? (
          <div className="mb-4">
            <Alert tone="success">{t.admin.settings.saved}</Alert>
          </div>
        ) : null}

        <QueryState isLoading={settings.isPending || form === null} error={settings.error}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label={t.admin.settings.slotIntervalLabel}
              htmlFor="slot-interval"
              required
              hint={t.admin.settings.slotIntervalHint}
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
              label={t.admin.settings.leadTimeLabel}
              htmlFor="lead-time"
              required
              hint={t.admin.settings.leadTimeHint}
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
              label={t.admin.settings.advanceWindowLabel}
              htmlFor="max-advance"
              required
              hint={t.admin.settings.advanceWindowHint}
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
              {t.admin.settings.save}
            </Button>
          </form>
        </QueryState>
      </Card>

      <Card>
        <CardHeader
          title={t.admin.settings.deploymentTitle}
          description={t.admin.settings.deploymentDescription}
        />

        <QueryState isLoading={settings.isPending} error={settings.error}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{t.admin.settings.timezoneLabel}</dt>
              <dd className="font-medium text-slate-900">{settings.data?.timezone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{t.admin.settings.currencyLabel}</dt>
              <dd className="font-medium text-slate-900">{settings.data?.currency}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">{t.admin.settings.timezoneNote}</p>
        </QueryState>
      </Card>
    </div>
  );
}
