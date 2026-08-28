import { useState, type FormEvent } from 'react';
import type { AdminService } from '@booking/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { QueryState } from '../../components/ui/QueryState';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
import { useAdminServices, useServiceMutations } from '../../hooks/use-admin';
import { ApiError } from '../../lib/api-client';
import { formatDuration, formatMoney } from '../../lib/format';

interface ServiceFormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  sortOrder: string;
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  durationMinutes: '30',
  price: '25.00',
  sortOrder: '0',
};

export function ServicesPage() {
  const { t } = useTranslation();
  const services = useAdminServices();
  const mutations = useServiceMutations();

  const [editing, setEditing] = useState<AdminService | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t.admin.services.title}
          description={t.admin.services.description}
          action={<Button onClick={() => setCreating(true)}>{t.admin.services.addService}</Button>}
        />

        <QueryState
          isLoading={services.isPending}
          error={services.error}
          isEmpty={services.data?.length === 0}
          emptyMessage={t.admin.services.empty}
        >
          <ul className="divide-y divide-slate-100">
            {(services.data ?? []).map((service) => (
              <li key={service.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {service.name}
                    {!service.active ? (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        {t.admin.services.disabledBadge}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatDuration(service.durationMinutes)} ·{' '}
                    {formatMoney(service.price, service.currency)}
                  </p>
                  {service.description ? (
                    <p className="mt-0.5 text-sm text-slate-500">{service.description}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(service)}>
                    {t.admin.services.edit}
                  </Button>
                  <Button
                    variant={service.active ? 'ghost' : 'primary'}
                    size="sm"
                    loading={mutations.update.isPending}
                    onClick={() =>
                      mutations.update.mutate({
                        id: service.id,
                        payload: { active: !service.active },
                      })
                    }
                  >
                    {service.active ? t.admin.services.disable : t.admin.services.enable}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </Card>

      {creating ? (
        <ServiceForm
          title={t.admin.services.addTitle}
          initial={EMPTY_FORM}
          isSaving={mutations.create.isPending}
          error={mutations.create.error}
          onClose={() => setCreating(false)}
          onSubmit={(values) =>
            mutations.create.mutate(
              {
                name: values.name,
                ...(values.description ? { description: values.description } : {}),
                durationMinutes: Number(values.durationMinutes),
                price: values.price,
                sortOrder: Number(values.sortOrder),
              },
              { onSuccess: () => setCreating(false) },
            )
          }
        />
      ) : null}

      {editing ? (
        <ServiceForm
          title={t.admin.services.editTitle(editing.name)}
          initial={{
            name: editing.name,
            description: editing.description ?? '',
            durationMinutes: String(editing.durationMinutes),
            price: editing.price,
            sortOrder: String(editing.sortOrder),
          }}
          isSaving={mutations.update.isPending}
          error={mutations.update.error}
          onClose={() => setEditing(null)}
          onSubmit={(values) =>
            mutations.update.mutate(
              {
                id: editing.id,
                payload: {
                  name: values.name,
                  description: values.description,
                  durationMinutes: Number(values.durationMinutes),
                  price: values.price,
                  sortOrder: Number(values.sortOrder),
                },
              },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      ) : null}
    </div>
  );
}

interface ServiceFormProps {
  title: string;
  initial: ServiceFormState;
  isSaving: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (values: ServiceFormState) => void;
}

function ServiceForm({ title, initial, isSaving, error, onClose, onSubmit }: ServiceFormProps) {
  const { t } = useTranslation();
  const errorMessage = useApiErrorMessage(error);
  const [values, setValues] = useState(initial);

  function update<K extends keyof ServiceFormState>(key: K, value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
  }

  return (
    <Modal title={title} onClose={onClose}>
      {error ? (
        <div className="mb-4">
          <Alert
            tone="error"
            title={t.admin.services.couldNotSave}
            details={error instanceof ApiError ? error.details : undefined}
          >
            {errorMessage}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t.admin.services.nameLabel} htmlFor="service-name" required>
          <TextInput
            id="service-name"
            required
            minLength={2}
            maxLength={80}
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
          />
        </Field>

        <Field label={t.admin.services.descriptionLabel} htmlFor="service-description">
          <TextArea
            id="service-description"
            rows={2}
            maxLength={500}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.admin.services.durationLabel}
            htmlFor="service-duration"
            required
            hint={t.admin.services.durationHint}
          >
            <TextInput
              id="service-duration"
              type="number"
              required
              min={5}
              max={480}
              step={5}
              value={values.durationMinutes}
              onChange={(event) => update('durationMinutes', event.target.value)}
            />
          </Field>

          <Field
            label={t.admin.services.priceLabel}
            htmlFor="service-price"
            required
            hint={t.admin.services.priceHint}
          >
            <TextInput
              id="service-price"
              required
              inputMode="decimal"
              pattern="\d{1,6}(\.\d{1,2})?"
              value={values.price}
              onChange={(event) => update('price', event.target.value)}
            />
          </Field>
        </div>

        <Field
          label={t.admin.services.sortOrderLabel}
          htmlFor="service-order"
          hint={t.admin.services.sortOrderHint}
        >
          <TextInput
            id="service-order"
            type="number"
            min={0}
            max={1000}
            value={values.sortOrder}
            onChange={(event) => update('sortOrder', event.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.admin.services.cancel}
          </Button>
          <Button type="submit" loading={isSaving}>
            {t.admin.services.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
