import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WEEKDAYS, Weekday } from '@booking/shared';
import { AppModule } from '../app.module';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Idempotent baseline data.
 *
 * Booking policy and working hours are needed for the application to function at
 * all, so they are always ensured. Example services are only added outside
 * production, and only when the catalogue is still empty.
 */

const OPEN_MINUTE = 9 * 60;
const CLOSE_MINUTE = 18 * 60;
const LUNCH_START = 13 * 60;
const LUNCH_END = 14 * 60;

const SAMPLE_SERVICES = [
  {
    name: 'Haircut',
    durationMinutes: 30,
    price: '25.00',
    sortOrder: 1,
    description: 'Classic cut and styling',
  },
  {
    name: 'Beard trim',
    durationMinutes: 20,
    price: '15.00',
    sortOrder: 2,
    description: 'Shape and line up',
  },
  {
    name: 'Hair and beard',
    durationMinutes: 60,
    price: '35.00',
    sortOrder: 3,
    description: 'Full service',
  },
  {
    name: 'Kids haircut',
    durationMinutes: 20,
    price: '18.00',
    sortOrder: 4,
    description: 'Up to 12 years old',
  },
];

async function main(): Promise<void> {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const config = app.get(AppConfig);

    await prisma.bookingSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    logger.log('Booking policy row ensured');

    const existingDays = await prisma.workingHours.count();

    if (existingDays === 0) {
      for (const dayOfWeek of WEEKDAYS) {
        const isSunday = dayOfWeek === Weekday.SUNDAY;

        await prisma.workingHours.create({
          data: {
            dayOfWeek,
            enabled: !isSunday,
            openMinute: OPEN_MINUTE,
            closeMinute: CLOSE_MINUTE,
            ...(isSunday
              ? {}
              : {
                  breaks: {
                    create: [{ startMinute: LUNCH_START, endMinute: LUNCH_END, label: 'Lunch' }],
                  },
                }),
          },
        });
      }
      logger.log('Created default working hours (Mon-Sat 09:00-18:00, lunch 13:00-14:00)');
    } else {
      logger.log('Working hours already configured, left untouched');
    }

    if (config.isProduction) {
      logger.log('Production environment: skipping example services');
      return;
    }

    const existingServices = await prisma.service.count();

    if (existingServices > 0) {
      logger.log('Services already exist, left untouched');
      return;
    }

    for (const service of SAMPLE_SERVICES) {
      await prisma.service.create({ data: service });
    }
    logger.log(`Created ${SAMPLE_SERVICES.length} example services`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
