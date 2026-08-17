import { Injectable } from '@nestjs/common';
import {
  minuteOfDayToLabel,
  WEEKDAYS,
  type WorkingHoursDay,
  type WorkingHoursResponse,
  type Weekday,
} from '@booking/shared';
import { ApiException } from '../common/errors/api-exception';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateWorkingHoursDto, WorkingHoursDayDto } from './dto/update-working-hours.dto';

export interface DaySchedule {
  enabled: boolean;
  openMinute: number;
  closeMinute: number;
  breaks: Array<{ startMinute: number; endMinute: number }>;
}

/** Sensible starting point: closed on Sunday, open six days with a lunch break. */
const DEFAULT_OPEN_MINUTE = 9 * 60;
const DEFAULT_CLOSE_MINUTE = 18 * 60;

@Injectable()
export class WorkingHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async getWeek(): Promise<WorkingHoursResponse> {
    const rows = await this.prisma.workingHours.findMany({
      include: { breaks: { orderBy: { startMinute: 'asc' } } },
    });

    const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));

    const days: WorkingHoursDay[] = WEEKDAYS.map((dayOfWeek) => {
      const row = byDay.get(dayOfWeek);

      if (!row) {
        return {
          dayOfWeek,
          enabled: false,
          openMinute: DEFAULT_OPEN_MINUTE,
          closeMinute: DEFAULT_CLOSE_MINUTE,
          breaks: [],
        };
      }

      return {
        dayOfWeek: row.dayOfWeek as Weekday,
        enabled: row.enabled,
        openMinute: row.openMinute,
        closeMinute: row.closeMinute,
        breaks: row.breaks.map((item) => ({
          id: item.id,
          startMinute: item.startMinute,
          endMinute: item.endMinute,
          label: item.label,
        })),
      };
    });

    return { timezone: this.config.timezone, days };
  }

  /**
   * Enabled days only, keyed by weekday. The availability engine loads the whole
   * week once and then computes any number of days from it.
   */
  async getWeekSchedules(): Promise<Map<Weekday, DaySchedule>> {
    const rows = await this.prisma.workingHours.findMany({
      where: { enabled: true },
      include: { breaks: true },
    });

    return new Map(
      rows.map((row) => [
        row.dayOfWeek as Weekday,
        {
          enabled: row.enabled,
          openMinute: row.openMinute,
          closeMinute: row.closeMinute,
          breaks: row.breaks.map((item) => ({
            startMinute: item.startMinute,
            endMinute: item.endMinute,
          })),
        },
      ]),
    );
  }

  /**
   * Replaces the whole week in one transaction. Sending the full week rather than
   * patching single days keeps the client simple and makes the write atomic.
   */
  async replaceWeek(dto: UpdateWorkingHoursDto): Promise<WorkingHoursResponse> {
    this.validate(dto.days);

    await this.prisma.$transaction(async (tx) => {
      for (const day of dto.days) {
        await tx.workingHours.upsert({
          where: { dayOfWeek: day.dayOfWeek },
          create: {
            dayOfWeek: day.dayOfWeek,
            enabled: day.enabled,
            openMinute: day.openMinute,
            closeMinute: day.closeMinute,
          },
          update: {
            enabled: day.enabled,
            openMinute: day.openMinute,
            closeMinute: day.closeMinute,
          },
        });

        await tx.weeklyBreak.deleteMany({ where: { dayOfWeek: day.dayOfWeek } });

        if (day.breaks.length > 0) {
          await tx.weeklyBreak.createMany({
            data: day.breaks.map((item) => ({
              dayOfWeek: day.dayOfWeek,
              startMinute: item.startMinute,
              endMinute: item.endMinute,
              label: item.label?.trim() || null,
            })),
          });
        }
      }
    });

    return this.getWeek();
  }

  private validate(days: WorkingHoursDayDto[]): void {
    const problems: string[] = [];
    const seen = new Set<number>();

    for (const day of days) {
      if (seen.has(day.dayOfWeek)) {
        problems.push(`Day ${day.dayOfWeek} appears more than once`);
      }
      seen.add(day.dayOfWeek);

      if (day.closeMinute <= day.openMinute) {
        problems.push(
          `Day ${day.dayOfWeek}: closing time (${minuteOfDayToLabel(day.closeMinute)}) must be after opening time (${minuteOfDayToLabel(day.openMinute)})`,
        );
      }

      const sorted = [...day.breaks].sort((a, b) => a.startMinute - b.startMinute);

      for (const [index, item] of sorted.entries()) {
        if (item.endMinute <= item.startMinute) {
          problems.push(
            `Day ${day.dayOfWeek}: break ending at ${minuteOfDayToLabel(item.endMinute)} must end after it starts`,
          );
        }

        if (item.startMinute < day.openMinute || item.endMinute > day.closeMinute) {
          problems.push(
            `Day ${day.dayOfWeek}: break ${minuteOfDayToLabel(item.startMinute)}-${minuteOfDayToLabel(item.endMinute)} falls outside working hours`,
          );
        }

        const previous = index > 0 ? sorted[index - 1] : undefined;
        if (previous && item.startMinute < previous.endMinute) {
          problems.push(`Day ${day.dayOfWeek}: breaks overlap each other`);
        }
      }
    }

    if (problems.length > 0) {
      throw ApiException.badRequest('The working hours are not valid.', problems);
    }
  }
}
