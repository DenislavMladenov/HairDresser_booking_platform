import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MINUTES_IN_DAY, type UpdateWorkingHoursDay, type UpdateWorkingHoursRequest, type Weekday } from '@booking/shared';

export class WeeklyBreakInputDto {
  @ApiProperty({ example: 780, description: 'Minutes from local midnight (13:00 = 780)' })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  startMinute: number;

  @ApiProperty({ example: 840, description: 'Minutes from local midnight (14:00 = 840)' })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  endMinute: number;

  @ApiPropertyOptional({ example: 'Lunch', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string | null;
}

export class WorkingHoursDayDto implements UpdateWorkingHoursDay {
  @ApiProperty({ example: 1, minimum: 1, maximum: 7, description: '1 = Monday, 7 = Sunday' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: Weekday;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 540, description: 'Opening time in minutes from local midnight' })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  openMinute: number;

  @ApiProperty({ example: 1080, description: 'Closing time in minutes from local midnight' })
  @IsInt()
  @Min(0)
  @Max(MINUTES_IN_DAY)
  closeMinute: number;

  @ApiProperty({ type: [WeeklyBreakInputDto] })
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => WeeklyBreakInputDto)
  breaks: WeeklyBreakInputDto[];
}

export class UpdateWorkingHoursDto implements UpdateWorkingHoursRequest {
  @ApiProperty({ type: [WorkingHoursDayDto], description: 'All seven days must be supplied' })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDayDto)
  days: WorkingHoursDayDto[];
}
