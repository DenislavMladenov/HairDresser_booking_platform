import { useState, type FormEvent } from 'react';
import type { BookingConfirmation, PublicService } from '@booking/shared';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Field, TextInput } from '../../components/ui/Field';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
import { useCreateBooking } from '../../hooks/use-booking-data';
import { ApiError } from '../../lib/api-client';
import { formatDateLong, formatDuration, formatMoney } from '../../lib/format';
import type { Translations } from '../../i18n/types';

interface DetailsStepProps {
  service: PublicService;
  date: string;
  slot: { startTime: string; label: string };
  onBooked: (confirmation: BookingConfirmation) => void;
  /** Called when the chosen time is gone, so the caller can send the user back. */
  onSlotLost: () => void;
}

interface FieldErrors {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

/**
 * Local checks here exist only to save a round trip; the server validates
 * everything again and its answer is what counts.
 */
function validate(
  name: string,
  phone: string,
  email: string,
  t: Translations['booking']['details'],
): FieldErrors {
  const errors: FieldErrors = {};

  if (name.trim().length < 2) {
    errors.customerName = t.nameError;
  }

  if ((phone.match(/\d/g) ?? []).length < 6) {
    errors.customerPhone = t.phoneError;
  }

  if (email.trim().length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    errors.customerEmail = t.emailError;
  }

  return errors;
}

export function DetailsStep({ service, date, slot, onBooked, onSlotLost }: DetailsStepProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const createBooking = useCreateBooking();
  const failure = createBooking.error;
  const failureMessage = useApiErrorMessage(failure);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const found = validate(name, phone, email, t.booking.details);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    createBooking.mutate(
      {
        serviceId: service.id,
        startTime: slot.startTime,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        ...(email.trim() ? { customerEmail: email.trim() } : {}),
      },
      { onSuccess: onBooked },
    );
  }

  const slotWasTaken = failure instanceof ApiError && failure.isSlotConflict;

  return (
    <Card>
      <CardHeader title={t.booking.details.title} />

      <dl className="mb-5 rounded-lg bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">{t.booking.details.summaryService}</dt>
          <dd className="font-medium text-slate-900">{service.name}</dd>
        </div>
        <div className="mt-1.5 flex justify-between gap-4">
          <dt className="text-slate-600">{t.booking.details.summaryWhen}</dt>
          <dd className="font-medium text-slate-900">
            {formatDateLong(date)} {t.booking.details.at} {slot.label}
          </dd>
        </div>
        <div className="mt-1.5 flex justify-between gap-4">
          <dt className="text-slate-600">{t.booking.details.summaryDuration}</dt>
          <dd className="font-medium text-slate-900">{formatDuration(service.durationMinutes)}</dd>
        </div>
        <div className="mt-1.5 flex justify-between gap-4">
          <dt className="text-slate-600">{t.booking.details.summaryPrice}</dt>
          <dd className="font-medium text-slate-900">
            {formatMoney(service.price, service.currency)}
          </dd>
        </div>
      </dl>

      {slotWasTaken ? (
        <div className="mb-4">
          <Alert tone="warning" title={t.booking.details.slotGoneTitle}>
            {failureMessage}
            <button
              type="button"
              onClick={onSlotLost}
              className="text-brand-700 mt-2 block text-sm font-medium underline"
            >
              {t.booking.details.pickAnotherTime}
            </button>
          </Alert>
        </div>
      ) : failure ? (
        <div className="mb-4">
          <Alert
            tone="error"
            title={t.booking.details.bookingFailedTitle}
            details={failure instanceof ApiError ? failure.details : undefined}
          >
            {failureMessage}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label={t.booking.details.nameLabel}
          htmlFor="customerName"
          required
          error={errors.customerName}
        >
          <TextInput
            id="customerName"
            name="name"
            autoComplete="name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field
          label={t.booking.details.phoneLabel}
          htmlFor="customerPhone"
          required
          hint={t.booking.details.phoneHint}
          error={errors.customerPhone}
        >
          <TextInput
            id="customerPhone"
            name="tel"
            type="tel"
            autoComplete="tel"
            value={phone}
            maxLength={25}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field
          label={t.booking.details.emailLabel}
          htmlFor="customerEmail"
          hint={t.booking.details.emailHint}
          error={errors.customerEmail}
        >
          <TextInput
            id="customerEmail"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            maxLength={255}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={createBooking.isPending}>
          {t.booking.details.submit}
        </Button>
      </form>
    </Card>
  );
}
