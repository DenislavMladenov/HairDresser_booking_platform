import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import type { BlockWholeDayRequest, CreateBlockedTimeRequest } from '@booking/shared';

export class CreateBlockedTimeDto implements CreateBlockedTimeRequest {
  @ApiProperty({ example: '2026-09-01T10:00:00+03:00' })
  @IsISO8601()
  startTime: string;

  @ApiProperty({ example: '2026-09-01T12:00:00+03:00' })
  @IsISO8601()
  endTime: string;

  @ApiPropertyOptional({ example: 'Dentist', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Block the period even though it already contains appointments',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class BlockDayDto implements BlockWholeDayRequest {
  @ApiProperty({ example: '2026-09-01', description: 'Calendar date in the business timezone' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ example: 'Holiday', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
