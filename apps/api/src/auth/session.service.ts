import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from './session-user';

const TOKEN_BYTES = 32;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
/** Avoid a database write on every single request just to touch lastSeenAt. */
const LAST_SEEN_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export interface IssuedSession {
  token: string;
  expiresAt: Date;
  maxAgeMs: number;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Creates a session and returns the plaintext token exactly once. Only the
   * SHA-256 hash is persisted, so the database never holds a usable credential.
   * The token itself is 256 bits of randomness, so hashing needs no salt or
   * key stretching.
   */
  async issue(userId: string): Promise<IssuedSession> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const maxAgeMs = this.config.sessionTtlDays * DAY_IN_MS;
    const expiresAt = new Date(Date.now() + maxAgeMs);

    await this.prisma.session.create({
      data: { tokenHash: hashToken(token), userId, expiresAt },
    });

    return { token, expiresAt, maxAgeMs };
  }

  /**
   * Resolves a session token to its user, or null when the session is unknown,
   * revoked or expired. Valid sessions get a sliding expiry so an active barber
   * is never logged out mid-shift.
   */
  async validate(token: string): Promise<SessionUser | null> {
    if (!token) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!session || session.revokedAt !== null) {
      return null;
    }

    const now = Date.now();

    if (session.expiresAt.getTime() <= now) {
      return null;
    }

    await this.refreshIfNeeded(session.id, session.expiresAt, session.lastSeenAt, now);

    return {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    };
  }

  async revoke(token: string): Promise<void> {
    if (!token) {
      return;
    }

    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Used when a password changes, to log out every device. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Housekeeping for rows that can no longer authenticate anyone. */
  async deleteExpired(): Promise<number> {
    const { count } = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (count > 0) {
      this.logger.log(`Removed ${count} expired session(s)`);
    }

    return count;
  }

  private async refreshIfNeeded(
    sessionId: string,
    expiresAt: Date,
    lastSeenAt: Date,
    now: number,
  ): Promise<void> {
    const maxAgeMs = this.config.sessionTtlDays * DAY_IN_MS;
    const shouldExtend = expiresAt.getTime() - now < maxAgeMs / 2;
    const shouldTouch = now - lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS;

    if (!shouldExtend && !shouldTouch) {
      return;
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastSeenAt: new Date(now),
        ...(shouldExtend ? { expiresAt: new Date(now + maxAgeMs) } : {}),
      },
    });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
