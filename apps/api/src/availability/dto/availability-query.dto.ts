import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2026-09-01', description: 'Calendar date in the business timezone' })
  @Matches(ISO_DATE, { message: 'date must be in YYYY-MM-DD format' })
  date: string;
}

export class AvailabilityCalendarQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Defaults to today' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({ default: 14, minimum: 1, maximum: 62 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(62)
  days?: number;
}
