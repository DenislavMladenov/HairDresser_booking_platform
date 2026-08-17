import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { UpdateBookingSettingsRequest } from '@booking/shared';

export class UpdateSettingsDto implements UpdateBookingSettingsRequest {
  @ApiPropertyOptional({
    minimum: 5,
    maximum: 240,
    description: 'Spacing between offered start times, in minutes',
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotIntervalMinutes?: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 10080,
    description: 'How far in advance a customer must book, in minutes',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  minLeadTimeMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365, description: 'How far ahead booking is open' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxAdvanceDays?: number;
}
