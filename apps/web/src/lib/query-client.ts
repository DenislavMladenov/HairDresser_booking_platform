import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/**
 * Availability changes as other customers book, so queries are treated as
 * short-lived. Retrying is pointless for the errors this API returns: a 409 or
 * 400 will not become a success, and a 401 needs a new session rather than
 * another attempt.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status !== 0 && error.status < 500) {
            return false;
          }

          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
