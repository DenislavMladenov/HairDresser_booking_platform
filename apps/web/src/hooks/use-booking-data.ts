import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBookingRequest } from '@booking/shared';
import { api } from '../lib/api';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => api.services.list(),
    // The catalogue changes rarely, unlike availability.
    staleTime: 5 * 60_000,
  });
}

export function useDayAvailability(serviceId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['availability', 'day', serviceId, date],
    queryFn: () => api.availability.day(serviceId as string, date as string),
    enabled: serviceId !== null && date !== null,
    // Someone else may take the slot at any moment, so never serve it stale.
    staleTime: 0,
  });
}

export function useAvailabilityCalendar(serviceId: string | null, from: string, days: number) {
  return useQuery({
    queryKey: ['availability', 'calendar', serviceId, from, days],
    queryFn: () => api.availability.calendar(serviceId as string, from, days),
    enabled: serviceId !== null,
    staleTime: 30_000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingRequest) => api.bookings.create(payload),
    onSettled: async () => {
      // Whether it succeeded or conflicted, what is free has changed.
      await queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
