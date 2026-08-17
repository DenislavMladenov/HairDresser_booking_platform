import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { BookingConfirmation } from '@booking/shared';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('public')
@Controller('bookings')
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  // Enough for a family booking several appointments, far too little to script
  // thousands of fake reservations.
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Books an appointment' })
  @ApiCreatedResponse({ description: 'Booking created' })
  @ApiConflictResponse({ description: 'The slot is unavailable or was just taken' })
  @ApiTooManyRequestsResponse({ description: 'Too many bookings from this client' })
  create(@Body() dto: CreateBookingDto): Promise<BookingConfirmation> {
    return this.bookings.createForCustomer(dto);
  }
}
