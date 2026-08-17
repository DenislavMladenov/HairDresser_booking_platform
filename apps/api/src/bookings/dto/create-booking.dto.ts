import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import type { CreateBookingRequest } from '@booking/shared';

/**
 * Permissive enough for international and local formats, strict enough to reject
 * free text. Six to twenty digits with optional separators.
 */
export const PHONE_PATTERN = /^\+?[\d][\d\s\-()]{4,19}$/;

export class CreateBookingDto implements CreateBookingRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: '2026-09-01T10:00:00+03:00',
    description: 'Must exactly match one of the start times returned by /api/availability',
  })
  @IsISO8601()
  startTime: string;

  @ApiProperty({ example: 'Ivan Petrov', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2, { message: 'Please enter your name' })
  @MaxLength(80)
  customerName: string;

  @ApiProperty({ example: '0888123456' })
  @Matches(PHONE_PATTERN, { message: 'Please enter a valid phone number' })
  customerPhone: string;

  @ApiPropertyOptional({ example: 'ivan@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(255)
  customerEmail?: string;
}
