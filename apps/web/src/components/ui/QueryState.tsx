import type { ReactNode } from 'react';
import { ApiError } from '../../lib/api-client';
import { Alert } from './Alert';
import { Spinner } from './Spinner';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  /** Rendered when the request succeeded but there is nothing to show. */
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

/**
 * One consistent place for the loading, error and empty states, so no screen
 * renders a blank panel or an unhandled error.
 */
export function QueryState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'Nothing to show yet.',
  children,
}: QueryStateProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-slate-400">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert tone="error" title="Could not load this">
        {error instanceof ApiError ? error.message : 'Please try again in a moment.'}
      </Alert>
    );
  }

  if (isEmpty) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return <>{children}</>;
}
