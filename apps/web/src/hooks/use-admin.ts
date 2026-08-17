import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  AdminBooking,
  CreateServiceRequest,
  UpdateBookingSettingsRequest,
  UpdateServiceRequest,
  UpdateWorkingHoursRequest,
} from '@booking/shared';
import { api, type AdminBookingFilters } from '../lib/api';

/**
 * Anything that changes an appointment also changes what customers can book, so
 * both caches are invalidated together. Getting this wrong would show the barber
 * a freed slot that the booking page still hides.
 */
async function invalidateSchedule(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
    queryClient.invalidateQueries({ queryKey: ['availability'] }),
  ]);
}

export function useAdminBookings(filters: AdminBookingFilters) {
  return useQuery({
    queryKey: ['admin', 'bookings', filters],
    queryFn: () => api.admin.bookings.list(filters),
    staleTime: 10_000,
  });
}

export function useBookingActions() {
  const queryClient = useQueryClient();
  const onSettled = () => invalidateSchedule(queryClient);

  return {
    confirm: useMutation({ mutationFn: (id: string) => api.admin.bookings.confirm(id), onSettled }),
    cancel: useMutation({ mutationFn: (id: string) => api.admin.bookings.cancel(id), onSettled }),
    complete: useMutation({
      mutationFn: (id: string) => api.admin.bookings.complete(id),
      onSettled,
    }),
    noShow: useMutation({ mutationFn: (id: string) => api.admin.bookings.noShow(id), onSettled }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
        api.admin.bookings.update(id, payload),
      onSettled,
    }),
    create: useMutation({
      mutationFn: (payload: Record<string, unknown>) => api.admin.bookings.create(payload),
      onSettled,
    }),
  };
}

export type BookingActions = ReturnType<typeof useBookingActions>;

export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => api.admin.services.list(),
  });
}

export function useServiceMutations() {
  const queryClient = useQueryClient();

  const onSettled = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] }),
      // The public catalogue and availability both depend on services.
      queryClient.invalidateQueries({ queryKey: ['services'] }),
      queryClient.invalidateQueries({ queryKey: ['availability'] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: (payload: CreateServiceRequest) => api.admin.services.create(payload),
      onSettled,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateServiceRequest }) =>
        api.admin.services.update(id, payload),
      onSettled,
    }),
  };
}

export function useWorkingHours() {
  return useQuery({
    queryKey: ['admin', 'working-hours'],
    queryFn: () => api.admin.workingHours.get(),
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWorkingHoursRequest) => api.admin.workingHours.replace(payload),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'working-hours'] }),
        queryClient.invalidateQueries({ queryKey: ['availability'] }),
      ]);
    },
  });
}

export function useBlockedTimes(from?: string, to?: string) {
  return useQuery({
    queryKey: ['admin', 'blocked-times', from, to],
    queryFn: () => api.admin.blockedTimes.list(from, to),
  });
}

export function useBlockedTimeMutations() {
  const queryClient = useQueryClient();

  const onSettled = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocked-times'] }),
      queryClient.invalidateQueries({ queryKey: ['availability'] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: (payload: {
        startTime: string;
        endTime: string;
        reason?: string;
        force?: boolean;
      }) => api.admin.blockedTimes.create(payload),
      onSettled,
    }),
    blockDay: useMutation({
      mutationFn: (payload: { date: string; reason?: string; force?: boolean }) =>
        api.admin.blockedTimes.blockDay(payload),
      onSettled,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.admin.blockedTimes.remove(id),
      onSettled,
    }),
  };
}

export function useSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.admin.settings.get(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateBookingSettingsRequest) => api.admin.settings.update(payload),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
        queryClient.invalidateQueries({ queryKey: ['availability'] }),
      ]);
    },
  });
}

/** Sorts appointments by start time, which is how the barber reads a day. */
export function sortByStart(bookings: AdminBooking[]): AdminBooking[] {
  return [...bookings].sort((first, second) => first.startTime.localeCompare(second.startTime));
}
