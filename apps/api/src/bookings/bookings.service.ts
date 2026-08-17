import { Injectable, Logger } from '@nestjs/common';
import type { AdminBooking, AdminBookingListResponse, BookingConfirmation } from '@booking/shared';
import { AvailabilityService } from '../availability/availability.service';
import { ApiException } from '../common/errors/api-exception';
import { isOverlapViolation } from '../common/errors/database-errors';
import { TimeService } from '../common/time/time.service';
import type { Prisma } from '../generated/prisma/client';
import { BookingStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceCatalogService } from '../services/service-catalog.service';
import { allowedTransitionsFrom, canTransition, occupiesSlot } from './booking-status';
import type {
  AdminBookingListQueryDto,
  CreateAdminBookingDto,
  UpdateAdminBookingDto,
} from './dto/admin-booking.dto';
import type { CreateBookingDto } from './dto/create-booking.dto';

/** Shape returned by every query that feeds the admin DTO mapper. */
const BOOKING_WITH_SERVICE = {
  service: { select: { id: true, name: true, durationMinutes: true, price: true } },
} satisfies Prisma.BookingInclude;

type BookingWithService = Prisma.BookingGetPayload<{ include: typeof BOOKING_WITH_SERVICE }>;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly time: TimeService,
    private readonly catalog: ServiceCatalogService,
    private readonly availability: AvailabilityService,
  ) {}

  // -------------------------------------------------------------------------
  // Public booking
  // -------------------------------------------------------------------------

  /**
   * Creates a booking on behalf of a customer.
   *
   * Two layers protect the slot. First, `assertBookable` re-derives the offered
   * slots server-side, so a request can only claim a time the system actually
   * advertised. Second, the `booking_no_overlap` exclusion constraint decides
   * the race between two simultaneous requests; whichever transaction commits
   * second is rejected by PostgreSQL and surfaces as a 409. The check is for a
   * helpful message, the constraint is the guarantee.
   */
  async createForCustomer(dto: CreateBookingDto): Promise<BookingConfirmation> {
    const service = await this.catalog.getBookableOrThrow(dto.serviceId);
    const startTime = this.time.parseInstant(dto.startTime);

    await this.availability.assertBookable(service.id, startTime);

    const endTime = this.addMinutes(startTime, service.durationMinutes);

    const booking = await this.insertBooking({
      customerName: dto.customerName.trim(),
      customerPhone: normalisePhone(dto.customerPhone),
      customerEmail: dto.customerEmail?.trim().toLowerCase() ?? null,
      serviceId: service.id,
      startTime,
      endTime,
      status: BookingStatus.PENDING,
      createdByAdmin: false,
    });

    this.logger.log(`Booking ${booking.id} created for ${startTime.toISOString()}`);

    return {
      id: booking.id,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      timezone: this.time.zone,
    };
  }

  // -------------------------------------------------------------------------
  // Admin queries
  // -------------------------------------------------------------------------

  async list(query: AdminBookingListQueryDto): Promise<AdminBookingListResponse> {
    const range = this.resolveRange(query);
    const where = {
      ...(range ? { startTime: { gte: range.start, lt: range.end } } : {}),
      ...(query.status && query.status.length > 0
        ? { status: { in: query.status as BookingStatus[] } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_WITH_SERVICE,
        orderBy: { startTime: 'asc' },
        take: query.take ?? 100,
        skip: query.skip ?? 0,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items: rows.map((row) => this.toAdminDto(row)), total };
  }

  async getById(id: string): Promise<AdminBooking> {
    return this.toAdminDto(await this.findOrThrow(id));
  }

  // -------------------------------------------------------------------------
  // Admin mutations
  // -------------------------------------------------------------------------

  /**
   * Manual booking by the barber. Working hours, breaks and lead time are not
   * enforced here on purpose: a walk-in at closing time is a legitimate entry.
   * Overlap protection still applies, because two customers in one chair is not.
   */
  async createAsAdmin(dto: CreateAdminBookingDto): Promise<AdminBooking> {
    const service = await this.catalog.getById(dto.serviceId);
    const startTime = this.time.parseInstant(dto.startTime);
    const endTime = this.addMinutes(startTime, service.durationMinutes);

    const booking = await this.insertBooking({
      customerName: dto.customerName.trim(),
      customerPhone: normalisePhone(dto.customerPhone),
      customerEmail: dto.customerEmail?.trim().toLowerCase() ?? null,
      serviceId: service.id,
      startTime,
      endTime,
      status: dto.status ?? BookingStatus.CONFIRMED,
      notes: dto.notes?.trim() || null,
      createdByAdmin: true,
    });

    return this.toAdminDto(await this.findOrThrow(booking.id));
  }

  async update(id: string, dto: UpdateAdminBookingDto): Promise<AdminBooking> {
    const existing = await this.findOrThrow(id);

    const service =
      dto.serviceId && dto.serviceId !== existing.service.id
        ? await this.catalog.getById(dto.serviceId)
        : existing.service;

    const startTime = dto.startTime ? this.time.parseInstant(dto.startTime) : existing.startTime;
    const timeChanged =
      startTime.getTime() !== existing.startTime.getTime() || service.id !== existing.service.id;
    const endTime = timeChanged
      ? this.addMinutes(startTime, service.durationMinutes)
      : existing.endTime;

    if (timeChanged && !occupiesSlot(existing.status)) {
      throw ApiException.invalidStatusTransition(
        `A ${existing.status.toLowerCase()} appointment cannot be rescheduled. Create a new one instead.`,
      );
    }

    try {
      await this.prisma.booking.update({
        where: { id },
        data: {
          ...(dto.customerName !== undefined ? { customerName: dto.customerName.trim() } : {}),
          ...(dto.customerPhone !== undefined
            ? { customerPhone: normalisePhone(dto.customerPhone) }
            : {}),
          ...(dto.customerEmail !== undefined
            ? { customerEmail: dto.customerEmail?.trim().toLowerCase() || null }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          ...(timeChanged ? { serviceId: service.id, startTime, endTime } : {}),
        },
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }

    return this.toAdminDto(await this.findOrThrow(id));
  }

  /**
   * Status changes go through the transition table rather than accepting any
   * value, so the rules live in one place instead of being re-checked in the UI.
   */
  async changeStatus(id: string, next: BookingStatus): Promise<AdminBooking> {
    const existing = await this.findOrThrow(id);

    if (existing.status === next) {
      return this.toAdminDto(existing);
    }

    if (!canTransition(existing.status, next)) {
      const allowed = allowedTransitionsFrom(existing.status);
      throw ApiException.invalidStatusTransition(
        allowed.length === 0
          ? `A ${existing.status.toLowerCase()} appointment can no longer be changed.`
          : `Cannot change ${existing.status} to ${next}. Allowed: ${allowed.join(', ')}.`,
      );
    }

    try {
      await this.prisma.booking.update({
        where: { id },
        data: {
          status: next,
          ...(next === BookingStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
        },
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }

    this.logger.log(`Booking ${id} moved from ${existing.status} to ${next}`);

    return this.toAdminDto(await this.findOrThrow(id));
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async insertBooking(data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    notes?: string | null;
    createdByAdmin: boolean;
  }) {
    try {
      return await this.prisma.booking.create({ data });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  private translateWriteError(error: unknown): unknown {
    if (isOverlapViolation(error)) {
      // The database refused an overlap. Either a concurrent request won the
      // race, or the admin tried to double book on purpose.
      return ApiException.slotTaken(
        'That time overlaps an existing appointment. Please choose another time.',
      );
    }

    return error;
  }

  private resolveRange(query: AdminBookingListQueryDto): { start: Date; end: Date } | null {
    if (query.date) {
      return this.time.localDayBounds(this.time.parseIsoDate(query.date));
    }

    if (query.from || query.to) {
      return {
        start: query.from ? this.time.parseInstant(query.from) : new Date(0),
        end: query.to ? this.time.parseInstant(query.to) : new Date('2999-12-31T00:00:00Z'),
      };
    }

    return null;
  }

  private async findOrThrow(id: string): Promise<BookingWithService> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: BOOKING_WITH_SERVICE,
    });

    if (!booking) {
      throw ApiException.notFound('Appointment not found.');
    }

    return booking;
  }

  private addMinutes(instant: Date, minutes: number): Date {
    return new Date(instant.getTime() + minutes * 60_000);
  }

  private toAdminDto(row: BookingWithService): AdminBooking {
    return {
      id: row.id,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
      service: {
        id: row.service.id,
        name: row.service.name,
        durationMinutes: row.service.durationMinutes,
        price: row.service.price.toFixed(2),
      },
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status,
      notes: row.notes,
      createdByAdmin: row.createdByAdmin,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

/** Collapses runs of whitespace so stored numbers are consistent. */
function normalisePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, ' ');
}
