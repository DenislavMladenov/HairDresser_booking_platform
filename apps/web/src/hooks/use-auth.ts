import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUser, LoginRequest } from '@booking/shared';
import { ApiError } from '../lib/api-client';
import { api } from '../lib/api';

const SESSION_KEY = ['auth', 'me'] as const;

/**
 * The session lives in an HttpOnly cookie, so the only way to know whether the
 * barber is signed in is to ask the server. A 401 is a valid answer, not an
 * error, which is why it resolves to null instead of throwing.
 */
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<AuthenticatedUser | null> => {
      try {
        return await api.auth.me();
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) {
          return null;
        }

        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => api.auth.login(credentials),
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: async () => {
      queryClient.setQueryData(SESSION_KEY, null);
      // Everything cached was fetched with the old session; drop all of it.
      await queryClient.invalidateQueries();
    },
  });
}
