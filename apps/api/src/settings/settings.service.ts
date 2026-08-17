import { Injectable } from '@nestjs/common';
import type { BookingSettingsDto } from '@booking/shared';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSettingsDto } from './dto/update-settings.dto';

export interface BookingPolicy {
  slotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
}

const DEFAULT_POLICY: BookingPolicy = {
  slotIntervalMinutes: 15,
  minLeadTimeMinutes: 60,
  maxAdvanceDays: 60,
};

/**
 * Booking policy lives in a single database row so the barber can change it
 * without a redeploy. Timezone and currency stay in the environment because
 * changing them retroactively would reinterpret existing data.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async getPolicy(): Promise<BookingPolicy> {
    const row = await this.prisma.bookingSettings.findUnique({ where: { id: 1 } });

    if (!row) {
      return DEFAULT_POLICY;
    }

    return {
      slotIntervalMinutes: row.slotIntervalMinutes,
      minLeadTimeMinutes: row.minLeadTimeMinutes,
      maxAdvanceDays: row.maxAdvanceDays,
    };
  }

  async get(): Promise<BookingSettingsDto> {
    const policy = await this.getPolicy();

    return {
      ...policy,
      timezone: this.config.timezone,
      currency: this.config.currency,
    };
  }

  async update(dto: UpdateSettingsDto): Promise<BookingSettingsDto> {
    const current = await this.getPolicy();
    const next: BookingPolicy = {
      slotIntervalMinutes: dto.slotIntervalMinutes ?? current.slotIntervalMinutes,
      minLeadTimeMinutes: dto.minLeadTimeMinutes ?? current.minLeadTimeMinutes,
      maxAdvanceDays: dto.maxAdvanceDays ?? current.maxAdvanceDays,
    };

    await this.prisma.bookingSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...next },
      update: next,
    });

    return this.get();
  }
}
