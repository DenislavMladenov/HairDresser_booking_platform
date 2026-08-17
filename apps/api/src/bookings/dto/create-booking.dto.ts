import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import type { CreateBookingRequest } from '@booking/shared';

/**
 * Permissive enough for the formats people actually type, strict enough to
 * reject free text. The lookahead requires between 6 and 15 digits in total,
 * and the body allows only digits, spaces, dashes and parentheses, with an
 * optional leading plus. Accepts "0888123456", "+359 88 812 3456" and
 * "(02) 123 4567"; rejects "call me" and "12".
 */
export const PHONE_PATTERN = /^(?=(?:\D*\d){6,15}\D*$)\+?[\d\s\-()]+$/;

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
