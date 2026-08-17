import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser, CsrfTokenResponse } from '@booking/shared';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  clearedSessionCookieOptions,
  sessionCookieOptions,
} from '../common/security/cookie-options';
import { AppConfig } from '../config/app-config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionGuard, readSessionToken } from './guards/session.guard';
import type { SessionUser } from './session-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Get('csrf')
  @ApiOperation({
    summary: 'Returns the CSRF token for this browser session',
    description:
      'The token is also set as a readable cookie. Send it back in the X-CSRF-Token header on every state-changing request.',
  })
  getCsrfToken(@Req() request: Request): CsrfTokenResponse {
    return { csrfToken: request.csrfToken ?? '' };
  }

  @Post('login')
  // Deliberately strict: five attempts per quarter hour per client is generous
  // for a single barber and hostile to credential stuffing.
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signs in and starts a session' })
  @ApiOkResponse({ description: 'Session cookie set' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUser> {
    const { user, session } = await this.auth.login(dto.email, dto.password);

    response.cookie(
      this.config.sessionCookieName,
      session.token,
      sessionCookieOptions(this.config, session.maxAgeMs),
    );

    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revokes the current session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readSessionToken(request, this.config.sessionCookieName);

    if (token) {
      await this.auth.logout(token);
    }

    response.clearCookie(this.config.sessionCookieName, clearedSessionCookieOptions(this.config));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Returns the signed-in user' })
  me(@CurrentUser() user: SessionUser): AuthenticatedUser {
    return { id: user.id, email: user.email, role: user.role };
  }
}
