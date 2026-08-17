const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

interface SpinnerProps {
  size?: keyof typeof SIZES;
  label?: string;
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`animate-spin rounded-full border-current border-t-transparent ${SIZES[size]}`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
    </span>
  );
}
