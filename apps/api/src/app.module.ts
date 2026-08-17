import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { BlockedTimesModule } from './blocked-times/blocked-times.module';
import { BookingsModule } from './bookings/bookings.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { CsrfCookieMiddleware } from './common/security/csrf.middleware';
import { CsrfGuard } from './common/security/csrf.guard';
import { TimeModule } from './common/time/time.module';
import { AppConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { SettingsModule } from './settings/settings.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    TimeModule,
    // In-memory rate limiting. A single-instance deployment needs no shared
    // store, which is why there is no Redis in this stack.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
    AuthModule,
    ServicesModule,
    WorkingHoursModule,
    BlockedTimesModule,
    SettingsModule,
    AvailabilityModule,
    BookingsModule,
  ],
  controllers: [HealthController],
  providers: [
    CsrfCookieMiddleware,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
