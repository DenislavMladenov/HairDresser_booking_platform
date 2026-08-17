import { Injectable } from '@nestjs/common';
import { ACTIVE_BOOKING_STATUSES, type BlockedTimeDto } from '@booking/shared';
import { ApiException } from '../common/errors/api-exception';
import { TimeService } from '../common/time/time.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BlockedTimeModel } from '../generated/prisma/models';
import type { BlockDayDto, CreateBlockedTimeDto } from './dto/create-blocked-time.dto';

export interface TimeRange {
  start: Date;
  end: Date;
}

@Injectable()
export class BlockedTimesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: TimeService,
  ) {}

  async list(from?: string, to?: string): Promise<BlockedTimeDto[]> {
    const rangeStart = from ? this.time.parseInstant(from) : undefined;
    const rangeEnd = to ? this.time.parseInstant(to) : undefined;

    const rows = await this.prisma.blockedTime.findMany({
      where: {
        ...(rangeEnd ? { startTime: { lt: rangeEnd } } : {}),
        ...(rangeStart ? { endTime: { gt: rangeStart } } : {}),
      },
      orderBy: { startTime: 'asc' },
      take: 500,
    });

    return rows.map((row) => this.toDto(row));
  }

  /** Overlapping blocked periods for a given window, used by the availability engine. */
  async findOverlapping(range: TimeRange): Promise<TimeRange[]> {
    const rows = await this.prisma.blockedTime.findMany({
      where: { startTime: { lt: range.end }, endTime: { gt: range.start } },
      select: { startTime: true, endTime: true },
    });

    return rows.map((row) => ({ start: row.startTime, end: row.endTime }));
  }

  async create(dto: CreateBlockedTimeDto): Promise<BlockedTimeDto> {
    const start = this.time.parseInstant(dto.startTime);
    const end = this.time.parseInstant(dto.endTime);

    return this.persist(start, end, dto.reason, dto.force ?? false);
  }

  /** Blocks an entire local calendar day, respecting daylight saving boundaries. */
  async blockWholeDay(dto: BlockDayDto): Promise<BlockedTimeDto> {
    const date = this.time.parseIsoDate(dto.date);
    const { start, end } = this.time.localDayBounds(date);

    return this.persist(start, end, dto.reason ?? 'Day off', dto.force ?? false);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.blockedTime.findUnique({ where: { id } });

    if (!existing) {
      throw ApiException.notFound('Blocked period not found.');
    }

    await this.prisma.blockedTime.delete({ where: { id } });
  }

  private async persist(
    start: Date,
    end: Date,
    reason: string | undefined,
    force: boolean,
  ): Promise<BlockedTimeDto> {
    if (end.getTime() <= start.getTime()) {
      throw ApiException.badRequest('The blocked period must end after it starts.');
    }

    if (!force) {
      // Blocking time that already holds appointments would hide them from the
      // availability engine while leaving the customers expecting to be served.
      const conflicting = await this.prisma.booking.count({
        where: {
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

      if (conflicting > 0) {
        throw ApiException.conflict(
          `This period already contains ${conflicting} appointment(s). Cancel or move them first, or repeat the request with force enabled.`,
        );
      }
    }

    const created = await this.prisma.blockedTime.create({
      data: { startTime: start, endTime: end, reason: reason?.trim() || null },
    });

    return this.toDto(created);
  }

  private toDto(row: BlockedTimeModel): BlockedTimeDto {
    return {
      id: row.id,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
