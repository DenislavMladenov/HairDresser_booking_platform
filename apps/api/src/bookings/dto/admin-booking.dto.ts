import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BOOKING_STATUSES, BookingStatus } from '@booking/shared';
import type {
  AdminBookingListQuery,
  CreateAdminBookingRequest,
  UpdateAdminBookingRequest,
} from '@booking/shared';
import { PHONE_PATTERN } from './create-booking.dto';

export class CreateAdminBookingDto implements CreateAdminBookingRequest {
  @IsUUID()
  serviceId: string;

  @IsISO8601()
  startTime: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  customerName: string;

  @Matches(PHONE_PATTERN, { message: 'Please enter a valid phone number' })
  customerPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ enum: BOOKING_STATUSES, default: BookingStatus.CONFIRMED })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class UpdateAdminBookingDto implements UpdateAdminBookingRequest {
  @ApiPropertyOptional({ description: 'Moves the appointment to a new time' })
  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Changing the service also changes the duration' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(PHONE_PATTERN, { message: 'Please enter a valid phone number' })
  customerPhone?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class AdminBookingListQueryDto implements AdminBookingListQuery {
  @ApiPropertyOptional({ description: 'Start of the range, inclusive' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'End of the range, exclusive' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Shorthand for a single local day' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  // A query string delivers `status` as a single value, a repeated key, or a
  // comma separated list. All three are normalised to an array here.
  @ApiPropertyOptional({ enum: BOOKING_STATUSES, isArray: true })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(BookingStatus, { each: true })
  status?: BookingStatus[];

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string') {
    // Anything else is rejected by @IsEnum below rather than coerced here.
    return [];
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
