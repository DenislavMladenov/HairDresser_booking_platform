import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { LoginRequest } from '@booking/shared';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'barber@example.com', maxLength: 255 })
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ minLength: 10, maxLength: 200, writeOnly: true })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(200)
  password: string;
}
