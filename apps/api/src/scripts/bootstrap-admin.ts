import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Creates the initial ADMIN account.
 *
 * The password is read from the ADMIN_PASSWORD environment variable and never
 * from a command line argument, because arguments are visible to other processes
 * via the process list and end up in shell history. It is never logged.
 *
 * Usage:
 *   ADMIN_EMAIL=barber@example.com ADMIN_PASSWORD='...' pnpm bootstrap:admin
 *
 * Re-running is safe. To replace the password of an existing account, also set
 * ADMIN_RESET_PASSWORD=true, which additionally revokes every active session.
 */

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface AdminCredentials {
  email: string;
  password: string;
  resetRequested: boolean;
}

/**
 * Reads the credentials only after the application context exists, because that
 * is what loads the .env file into process.env. Reading earlier would silently
 * ignore values configured in .env.
 */
function readCredentials(): AdminCredentials | string[] {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const problems: string[] = [];

  if (!email) {
    problems.push('ADMIN_EMAIL is required');
  } else if (!EMAIL_PATTERN.test(email)) {
    problems.push('ADMIN_EMAIL is not a valid email address');
  }

  if (!password) {
    problems.push('ADMIN_PASSWORD is required (set it in .env or pass it inline)');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (problems.length > 0 || !email || !password) {
    return problems;
  }

  return { email, password, resetRequested: process.env.ADMIN_RESET_PASSWORD === 'true' };
}

async function main(): Promise<void> {
  const logger = new Logger('BootstrapAdmin');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const credentials = readCredentials();

    if (Array.isArray(credentials)) {
      logger.error(`Cannot create the admin account:\n  - ${credentials.join('\n  - ')}`);
      process.exitCode = 1;
      return;
    }

    const { email, password, resetRequested } = credentials;
    const prisma = app.get(PrismaService);
    const passwords = app.get(PasswordService);
    const sessions = app.get(SessionService);

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && !resetRequested) {
      logger.log(`Admin ${email} already exists. Nothing to do.`);
      logger.log('Set ADMIN_RESET_PASSWORD=true to replace the password.');
      return;
    }

    const passwordHash = await passwords.hash(password);

    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
      // A password change must invalidate anything already signed in.
      await sessions.revokeAllForUser(existing.id);
      logger.log(`Password updated for ${email}; all sessions revoked.`);
      return;
    }

    const created = await prisma.user.create({
      data: { email, passwordHash, role: Role.ADMIN },
    });

    logger.log(`Created admin account ${created.email} with role ${created.role}.`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Admin bootstrap failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
