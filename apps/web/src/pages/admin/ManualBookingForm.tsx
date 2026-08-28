import { useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, Select, TextArea, TextInput } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
import { useAdminServices, type BookingActions } from '../../hooks/use-admin';
import { ApiError } from '../../lib/api-client';
import { BUSINESS_TIMEZONE, todayIsoDate } from '../../lib/format';

interface ManualBookingFormProps {
  actions: BookingActions;
  onClose: () => void;
}

/**
 * Walk-ins and phone bookings. Working hours and lead time do not apply here,
 * but the server still refuses a time that overlaps another appointment.
 */
export function ManualBookingForm({ actions, onClose }: ManualBookingFormProps) {
  const { t } = useTranslation();
  const services = useAdminServices();
  const activeServices = (services.data ?? []).filter((service) => service.active);

  const [date, setDate] = useState(todayIsoDate());
  const [time, setTime] = useState('10:00');
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const chosenService = serviceId || activeServices[0]?.id || '';

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const startTime = DateTime.fromISO(`${date}T${time}`, { zone: BUSINESS_TIMEZONE })
      .toUTC()
      .toISO();

    if (!startTime || !chosenService) {
      return;
    }

    actions.create.mutate(
      {
        serviceId: chosenService,
        startTime,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      { onSuccess: onClose },
    );
  }

  const failure = actions.create.error;
  const failureMessage = useApiErrorMessage(failure);

  return (
    <Modal title={t.admin.manualBooking.title} onClose={onClose}>
      {failure ? (
        <div className="mb-4">
          <Alert
            tone="error"
            title={t.admin.manualBooking.couldNotAdd}
            details={failure instanceof ApiError ? failure.details : undefined}
          >
            {failureMessage}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.manualBooking.dateLabel} htmlFor="manual-date" required>
            <TextInput
              id="manual-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>

          <Field label={t.admin.manualBooking.timeLabel} htmlFor="manual-time" required>
            <TextInput
              id="manual-time"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>

        <Field label={t.admin.manualBooking.serviceLabel} htmlFor="manual-service" required>
          <Select
            id="manual-service"
            required
            value={chosenService}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {activeServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.admin.manualBooking.nameLabel} htmlFor="manual-name" required>
          <TextInput
            id="manual-name"
            required
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label={t.admin.manualBooking.phoneLabel} htmlFor="manual-phone" required>
          <TextInput
            id="manual-phone"
            type="tel"
            required
            value={phone}
            maxLength={25}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field label={t.admin.manualBooking.notesLabel} htmlFor="manual-notes">
          <TextArea
            id="manual-notes"
            rows={2}
            value={notes}
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.admin.manualBooking.cancel}
          </Button>
          <Button type="submit" loading={actions.create.isPending}>
            {t.admin.manualBooking.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
