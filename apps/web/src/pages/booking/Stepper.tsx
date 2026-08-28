import { useTranslation } from '../../i18n/language-context-core';

export type Step = 'service' | 'date' | 'time' | 'details' | 'done';

/** 'done' is not a step in the bar: the success screen replaces it entirely. */
const ORDER: Exclude<Step, 'done'>[] = ['service', 'date', 'time', 'details'];

export function Stepper({ current }: { current: Step }) {
  const { t } = useTranslation();
  const labels: Record<Exclude<Step, 'done'>, string> = {
    service: t.booking.stepper.service,
    date: t.booking.stepper.day,
    time: t.booking.stepper.time,
    details: t.booking.stepper.details,
  };

  // -1 while on the success screen, which marks every step as done.
  const currentIndex = ORDER.findIndex((step) => step === current);

  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={t.booking.stepper.ariaLabel}>
      {ORDER.map((step, index) => {
        const isDone = currentIndex > index;
        const isCurrent = currentIndex === index;

        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isDone
                  ? 'bg-brand-600 text-white'
                  : isCurrent
                    ? 'bg-brand-100 text-brand-900 ring-brand-600 ring-2'
                    : 'bg-slate-200 text-slate-500'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isDone ? '✓' : index + 1}
            </span>
            <span
              className={`hidden sm:inline ${isCurrent ? 'font-medium text-slate-900' : 'text-slate-500'}`}
            >
              {labels[step]}
            </span>
            {index < ORDER.length - 1 ? (
              <span className={`h-px flex-1 ${isDone ? 'bg-brand-600' : 'bg-slate-200'}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
