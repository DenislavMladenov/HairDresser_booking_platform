import { Body, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { AdminBooking, AdminBookingListResponse } from '@booking/shared';
import { AdminController } from '../common/decorators/admin-controller.decorator';
import { BookingStatus } from '../generated/prisma/enums';
import { BookingsService } from './bookings.service';
import {
  AdminBookingListQueryDto,
  CreateAdminBookingDto,
  UpdateAdminBookingDto,
} from './dto/admin-booking.dto';

/**
 * Status changes are separate endpoints rather than a generic status field, so
 * each transition is explicit in the API and in the audit log.
 */
@AdminController('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lists appointments by day, range and status' })
  list(@Query() query: AdminBookingListQueryDto): Promise<AdminBookingListResponse> {
    return this.bookings.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Reads one appointment with customer details' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminBooking> {
    return this.bookings.getById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Creates an appointment manually',
    description:
      'Working hours and lead time are not enforced for manual entries, but overlapping appointments are still rejected.',
  })
  create(@Body() dto: CreateAdminBookingDto): Promise<AdminBooking> {
    return this.bookings.createAsAdmin(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Reschedules an appointment or edits its details and notes' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminBookingDto,
  ): Promise<AdminBooking> {
    return this.bookings.update(id, dto);
  }

  // These transitions update an existing appointment rather than creating a
  // resource, so they answer 200 instead of Nest's default 201 for POST.
  // Re-applying the status a booking already has is treated as a no-op.
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirms a pending appointment' })
  confirm(@Param('id', ParseUUIDPipe) id: string): Promise<AdminBooking> {
    return this.bookings.changeStatus(id, BookingStatus.CONFIRMED);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancels an appointment',
    description: 'Cancelling frees the time slot immediately.',
  })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<AdminBooking> {
    return this.bookings.changeStatus(id, BookingStatus.CANCELLED);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marks an appointment as completed' })
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<AdminBooking> {
    return this.bookings.changeStatus(id, BookingStatus.COMPLETED);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marks an appointment as a no-show' })
  noShow(@Param('id', ParseUUIDPipe) id: string): Promise<AdminBooking> {
    return this.bookings.changeStatus(id, BookingStatus.NO_SHOW);
  }
}
