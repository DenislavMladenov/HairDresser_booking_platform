import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { CreateServiceRequest } from '@booking/shared';

/** Money arrives as a decimal string so no precision is lost in JSON. */
const MONEY_PATTERN = /^\d{1,6}(\.\d{1,2})?$/;

export class CreateServiceDto implements CreateServiceRequest {
  @ApiProperty({ example: 'Haircut', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 30, minimum: 5, maximum: 480 })
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes: number;

  @ApiProperty({ example: '25.00', description: 'Decimal string with up to two decimal places' })
  @Matches(MONEY_PATTERN, { message: 'Price must be a number with up to two decimal places' })
  price: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Lower values are listed first' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
