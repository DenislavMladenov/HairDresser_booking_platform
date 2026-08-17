import type { BookingStatus, Role, Weekday } from './enums';

/**
 * Timestamps crossing the API are always ISO-8601 strings with an explicit UTC
 * offset. Calendar dates (no time component) are `yyyy-MM-dd` in the business
 * timezone. Money is a decimal string so no precision is lost in JSON.
 */
export type IsoDateTime = string;
export type IsoDate = string;
export type DecimalString = string;

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: DecimalString;
  currency: string;
}

export interface AvailabilityQuery {
  serviceId: string;
  date: IsoDate;
}

export interface AvailabilitySlot {
  /** Slot start as an absolute instant. */
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  /** Start time rendered as `HH:mm` in the business timezone, for convenience. */
  label: string;
}

export interface AvailabilityResponse {
  date: IsoDate;
  serviceId: string;
  timezone: string;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

export interface DayAvailabilitySummary {
  date: IsoDate;
  hasAvailability: boolean;
}

export interface AvailabilityCalendarResponse {
  timezone: string;
  serviceId: string;
  days: DayAvailabilitySummary[];
}

export interface CreateBookingRequest {
  serviceId: string;
  startTime: IsoDateTime;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

/** Public confirmation. Deliberately contains no data about other customers. */
export interface BookingConfirmation {
  id: string;
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  status: BookingStatus;
  serviceName: string;
  durationMinutes: number;
  timezone: string;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface CsrfTokenResponse {
  csrfToken: string;
}

// ---------------------------------------------------------------------------
// Admin contract
// ---------------------------------------------------------------------------

export interface AdminBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: DecimalString;
  };
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  status: BookingStatus;
  notes: string | null;
  createdByAdmin: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AdminBookingListQuery {
  from?: IsoDateTime;
  to?: IsoDateTime;
  date?: IsoDate;
  status?: BookingStatus[];
  take?: number;
  skip?: number;
}

export interface AdminBookingListResponse {
  items: AdminBooking[];
  total: number;
}

export interface CreateAdminBookingRequest {
  serviceId: string;
  startTime: IsoDateTime;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  status?: BookingStatus;
}

export interface UpdateAdminBookingRequest {
  startTime?: IsoDateTime;
  serviceId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  notes?: string | null;
}

export interface AdminService extends PublicService {
  active: boolean;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  price: DecimalString;
  active?: boolean;
  sortOrder?: number;
}

export type UpdateServiceRequest = Partial<CreateServiceRequest>;

export interface WeeklyBreakDto {
  id: string;
  startMinute: number;
  endMinute: number;
  label: string | null;
}

export interface WorkingHoursDay {
  dayOfWeek: Weekday;
  enabled: boolean;
  openMinute: number;
  closeMinute: number;
  breaks: WeeklyBreakDto[];
}

export interface WorkingHoursResponse {
  timezone: string;
  days: WorkingHoursDay[];
}

export interface UpdateWorkingHoursDay {
  dayOfWeek: Weekday;
  enabled: boolean;
  openMinute: number;
  closeMinute: number;
  breaks: Array<{
    startMinute: number;
    endMinute: number;
    label?: string | null;
  }>;
}

export interface UpdateWorkingHoursRequest {
  days: UpdateWorkingHoursDay[];
}

export interface BlockedTimeDto {
  id: string;
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  reason: string | null;
  createdAt: IsoDateTime;
}

export interface CreateBlockedTimeRequest {
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  reason?: string;
}

export interface BlockWholeDayRequest {
  date: IsoDate;
  reason?: string;
}

export interface BookingSettingsDto {
  slotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  timezone: string;
  currency: string;
}

export type UpdateBookingSettingsRequest = Partial<
  Pick<BookingSettingsDto, 'slotIntervalMinutes' | 'minLeadTimeMinutes' | 'maxAdvanceDays'>
>;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const ApiErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  SLOT_TAKEN: 'SLOT_TAKEN',
  SERVICE_INACTIVE: 'SERVICE_INACTIVE',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF_FAILED: 'CSRF_FAILED',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  /** Field-level messages, present for validation failures. */
  details?: string[];
}
