import { useState, type FormEvent } from 'react';
import type { AdminBooking } from '@booking/shared';
import { DateTime } from 'luxon';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { useAdminServices, type BookingActions } from '../../hooks/use-admin';
import { ApiError } from '../../lib/api-client';
import { BUSINESS_TIMEZONE } from '../../lib/format';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Field';

interface BookingEditorProps {
  booking: AdminBooking;
  actions: BookingActions;
  onClose: () => void;
}

/** Splits an instant into the date and time inputs the form uses. */
function toLocalParts(isoDateTime: string): { date: string; time: string } {
  const local = DateTime.fromISO(isoDateTime).setZone(BUSINESS_TIMEZONE);
  return { date: local.toFormat('yyyy-MM-dd'), time: local.toFormat('HH:mm') };
}

export function BookingEditor({ booking, actions, onClose }: BookingEditorProps) {
  const services = useAdminServices();
  const initial = toLocalParts(booking.startTime);

  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [serviceId, setServiceId] = useState(booking.service.id);
  const [name, setName] = useState(booking.customerName);
  const [phone, setPhone] = useState(booking.customerPhone);
  const [notes, setNotes] = useState(booking.notes ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const startTime = DateTime.fromISO(`${date}T${time}`, { zone: BUSINESS_TIMEZONE })
      .toUTC()
      .toISO();

    if (!startTime) {
      return;
    }

    actions.update.mutate(
      {
        id: booking.id,
        payload: {
          startTime,
          serviceId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          notes: notes.trim(),
        },
      },
      { onSuccess: onClose },
    );
  }

  const failure = actions.update.error;

  return (
    <Modal title="Edit appointment" onClose={onClose}>
      {failure ? (
        <div className="mb-4">
          <Alert
            tone="error"
            title="Could not save"
            details={failure instanceof ApiError ? failure.details : undefined}
          >
            {failure instanceof ApiError ? failure.message : 'Please try again.'}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="edit-date" required>
            <TextInput
              id="edit-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>

          <Field label="Time" htmlFor="edit-time" required>
            <TextInput
              id="edit-time"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Service"
          htmlFor="edit-service"
          hint="Changing the service recalculates the end time."
        >
          <Select
            id="edit-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {(services.data ?? []).map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Customer name" htmlFor="edit-name" required>
          <TextInput
            id="edit-name"
            required
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="Phone" htmlFor="edit-phone" required>
          <TextInput
            id="edit-phone"
            type="tel"
            required
            value={phone}
            maxLength={25}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor="edit-notes" hint="Only you can see these.">
          <TextArea
            id="edit-notes"
            rows={3}
            value={notes}
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={actions.update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
