import type {
  AdminBooking,
  AdminBookingListResponse,
  AdminService,
  AuthenticatedUser,
  AvailabilityCalendarResponse,
  AvailabilityResponse,
  BlockedTimeDto,
  BookingConfirmation,
  BookingSettingsDto,
  CreateBookingRequest,
  CreateServiceRequest,
  LoginRequest,
  PublicService,
  UpdateBookingSettingsRequest,
  UpdateServiceRequest,
  UpdateWorkingHoursRequest,
  WorkingHoursResponse,
} from '@booking/shared';
import { http } from './api-client';

/**
 * Every call the application can make, typed against the shared API contract.
 * Screens never build URLs or shapes by hand.
 */

export interface AdminBookingFilters {
  date?: string;
  from?: string;
  to?: string;
  status?: string[];
  take?: number;
  skip?: number;
}

function toQuery(params: Record<string, string | number | string[] | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  services: {
    list: () => http.get<PublicService[]>('/services'),
  },

  availability: {
    day: (serviceId: string, date: string) =>
      http.get<AvailabilityResponse>(`/availability${toQuery({ serviceId, date })}`),
    calendar: (serviceId: string, from: string, days: number) =>
      http.get<AvailabilityCalendarResponse>(
        `/availability/calendar${toQuery({ serviceId, from, days })}`,
      ),
  },

  bookings: {
    create: (payload: CreateBookingRequest) => http.post<BookingConfirmation>('/bookings', payload),
  },

  auth: {
    me: () => http.get<AuthenticatedUser>('/auth/me'),
    login: (payload: LoginRequest) => http.post<AuthenticatedUser>('/auth/login', payload),
    logout: () => http.post<void>('/auth/logout'),
  },

  admin: {
    bookings: {
      list: (filters: AdminBookingFilters) =>
        http.get<AdminBookingListResponse>(`/admin/bookings${toQuery({ ...filters })}`),
      get: (id: string) => http.get<AdminBooking>(`/admin/bookings/${id}`),
      create: (payload: Record<string, unknown>) =>
        http.post<AdminBooking>('/admin/bookings', payload),
      update: (id: string, payload: Record<string, unknown>) =>
        http.patch<AdminBooking>(`/admin/bookings/${id}`, payload),
      confirm: (id: string) => http.post<AdminBooking>(`/admin/bookings/${id}/confirm`),
      cancel: (id: string) => http.post<AdminBooking>(`/admin/bookings/${id}/cancel`),
      complete: (id: string) => http.post<AdminBooking>(`/admin/bookings/${id}/complete`),
      noShow: (id: string) => http.post<AdminBooking>(`/admin/bookings/${id}/no-show`),
    },

    services: {
      list: () => http.get<AdminService[]>('/admin/services'),
      create: (payload: CreateServiceRequest) =>
        http.post<AdminService>('/admin/services', payload),
      update: (id: string, payload: UpdateServiceRequest) =>
        http.patch<AdminService>(`/admin/services/${id}`, payload),
    },

    workingHours: {
      get: () => http.get<WorkingHoursResponse>('/admin/working-hours'),
      replace: (payload: UpdateWorkingHoursRequest) =>
        http.put<WorkingHoursResponse>('/admin/working-hours', payload),
    },

    blockedTimes: {
      list: (from?: string, to?: string) =>
        http.get<BlockedTimeDto[]>(`/admin/blocked-times${toQuery({ from, to })}`),
      create: (payload: { startTime: string; endTime: string; reason?: string; force?: boolean }) =>
        http.post<BlockedTimeDto>('/admin/blocked-times', payload),
      blockDay: (payload: { date: string; reason?: string; force?: boolean }) =>
        http.post<BlockedTimeDto>('/admin/blocked-times/whole-day', payload),
      remove: (id: string) => http.delete<void>(`/admin/blocked-times/${id}`),
    },

    settings: {
      get: () => http.get<BookingSettingsDto>('/admin/settings'),
      update: (payload: UpdateBookingSettingsRequest) =>
        http.put<BookingSettingsDto>('/admin/settings', payload),
    },
  },
};
