import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info' | 'warning';

const TONES: Record<Tone, string> = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-brand-50 text-brand-900 ring-brand-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  /** Field-level messages returned by the API for validation failures. */
  details?: string[];
}

export function Alert({ tone = 'info', title, children, details }: AlertProps) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm ring-1 ${TONES[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
      {details && details.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-0.5">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
