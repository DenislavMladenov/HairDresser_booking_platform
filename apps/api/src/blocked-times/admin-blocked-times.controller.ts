import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { BlockedTimeDto } from '@booking/shared';
import { AdminController } from '../common/decorators/admin-controller.decorator';
import { BlockedTimesService } from './blocked-times.service';
import { BlockDayDto, CreateBlockedTimeDto } from './dto/create-blocked-time.dto';

@AdminController('admin/blocked-times')
export class AdminBlockedTimesController {
  constructor(private readonly blockedTimes: BlockedTimesService) {}

  @Get()
  @ApiOperation({ summary: 'Lists blocked periods, optionally within a range' })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01T00:00:00+03:00' })
  @ApiQuery({ name: 'to', required: false, example: '2026-10-01T00:00:00+03:00' })
  list(@Query('from') from?: string, @Query('to') to?: string): Promise<BlockedTimeDto[]> {
    return this.blockedTimes.list(from, to);
  }

  @Post()
  @ApiOperation({ summary: 'Blocks a period of time' })
  create(@Body() dto: CreateBlockedTimeDto): Promise<BlockedTimeDto> {
    return this.blockedTimes.create(dto);
  }

  @Post('whole-day')
  @ApiOperation({ summary: 'Blocks an entire day' })
  blockDay(@Body() dto: BlockDayDto): Promise<BlockedTimeDto> {
    return this.blockedTimes.blockWholeDay(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Removes a blocked period' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.blockedTimes.remove(id);
  }
}
