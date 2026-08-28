import { useState } from 'react';
import type { BookingConfirmation, PublicService } from '@booking/shared';
import { Alert } from '../../components/ui/Alert';
import { QueryState } from '../../components/ui/QueryState';
import { LanguageToggle } from '../../i18n/LanguageToggle';
import { useTranslation } from '../../i18n/language-context-core';
import { useServices } from '../../hooks/use-booking-data';
import { todayIsoDate } from '../../lib/format';
import { DateStep } from './DateStep';
import { DetailsStep } from './DetailsStep';
import { ServiceStep } from './ServiceStep';
import { Stepper, type Step } from './Stepper';
import { SuccessStep } from './SuccessStep';
import { TimeStep } from './TimeStep';

/**
 * The customer flow: choose a service, a day, a time, enter contact details and
 * confirm. Each step only unlocks once the previous one has an answer, and the
 * server decides what is bookable at every stage.
 */
export function BookingPage() {
  const { t } = useTranslation();
  const servicesQuery = useServices();

  const [service, setService] = useState<PublicService | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ startTime: string; label: string } | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const step: Step = confirmation
    ? 'done'
    : slot
      ? 'details'
      : date
        ? 'time'
        : service
          ? 'date'
          : 'service';

  function restart(): void {
    setService(null);
    setDate(null);
    setSlot(null);
    setConfirmation(null);
  }

  return (
    <div className="min-h-screen">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="text-xl font-semibold">{t.booking.header.title}</h1>
            <p className="text-brand-100 text-sm">{t.booking.header.subtitle}</p>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {step === 'done' && confirmation ? (
          <SuccessStep confirmation={confirmation} onBookAnother={restart} />
        ) : (
          <>
            <Stepper current={step} />

            <QueryState
              isLoading={servicesQuery.isPending}
              error={servicesQuery.error}
              isEmpty={servicesQuery.data?.length === 0}
              emptyMessage={t.booking.services.empty}
            >
              <div className="mt-6 space-y-6">
                <ServiceStep
                  services={servicesQuery.data ?? []}
                  selected={service}
                  onSelect={(next) => {
                    setService(next);
                    setDate(null);
                    setSlot(null);
                  }}
                />

                {service ? (
                  <DateStep
                    serviceId={service.id}
                    from={todayIsoDate()}
                    selected={date}
                    onSelect={(next) => {
                      setDate(next);
                      setSlot(null);
                    }}
                  />
                ) : null}

                {service && date ? (
                  <TimeStep
                    serviceId={service.id}
                    date={date}
                    selected={slot?.startTime ?? null}
                    onSelect={(next) => setSlot(next)}
                  />
                ) : null}

                {service && date && slot ? (
                  <DetailsStep
                    service={service}
                    date={date}
                    slot={slot}
                    onBooked={setConfirmation}
                    onSlotLost={() => setSlot(null)}
                  />
                ) : null}
              </div>
            </QueryState>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 py-8">
        <Alert tone="info">{t.booking.footer.privacyNotice}</Alert>
      </footer>
    </div>
  );
}
