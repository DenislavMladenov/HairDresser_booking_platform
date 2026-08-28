import type { ReactNode } from 'react';
import { useApiErrorMessage } from '../../i18n/api-errors';
import { useTranslation } from '../../i18n/language-context-core';
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
  emptyMessage,
  children,
}: QueryStateProps) {
  const { t } = useTranslation();
  const errorMessage = useApiErrorMessage(error);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-slate-400">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert tone="error" title={t.shared.queryState.errorTitle}>
        {errorMessage}
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        {emptyMessage ?? t.shared.queryState.defaultEmpty}
      </p>
    );
  }

  return <>{children}</>;
}
