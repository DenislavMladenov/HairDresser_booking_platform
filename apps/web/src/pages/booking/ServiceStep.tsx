import type { PublicService } from '@booking/shared';
import { Card, CardHeader } from '../../components/ui/Card';
import { formatDuration, formatMoney } from '../../lib/format';

interface ServiceStepProps {
  services: PublicService[];
  selected: PublicService | null;
  onSelect: (service: PublicService) => void;
}

export function ServiceStep({ services, selected, onSelect }: ServiceStepProps) {
  return (
    <Card>
      <CardHeader title="Choose a service" />

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selected?.id === service.id;

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              aria-pressed={isSelected}
              className={`rounded-lg p-4 text-left transition-colors ${
                isSelected
                  ? 'bg-brand-50 ring-brand-600 ring-2'
                  : 'ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-slate-900">{service.name}</span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatMoney(service.price, service.currency)}
                </span>
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                {formatDuration(service.durationMinutes)}
              </span>
              {service.description ? (
                <span className="mt-2 block text-sm text-slate-500">{service.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
