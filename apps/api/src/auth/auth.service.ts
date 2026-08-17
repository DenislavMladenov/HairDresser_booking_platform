import { Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '@booking/shared';
import { ApiException } from '../common/errors/api-exception';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { SessionService, type IssuedSession } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private decoyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  /**
   * Verifies credentials and opens a session. The same error is returned for an
   * unknown email and a wrong password, and an unknown email still pays the cost
   * of a hash verification, so the response reveals nothing about which
   * addresses exist.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthenticatedUser; session: IssuedSession }> {
    const normalisedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalisedEmail } });

    const passwordMatches = user
      ? await this.passwords.verify(user.passwordHash, password)
      : await this.burnTime(password);

    if (!user || !passwordMatches) {
      this.logger.warn('Failed login attempt');
      throw ApiException.unauthorized('Incorrect email or password.');
    }

    const session = await this.sessions.issue(user.id);
    this.logger.log(`User ${user.id} logged in`);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      session,
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessions.revoke(token);
  }

  private async burnTime(password: string): Promise<false> {
    this.decoyHash ??= this.passwords.hash('decoy-password-for-constant-time-login');
    await this.passwords.verify(await this.decoyHash, password);
    return false;
  }
}
