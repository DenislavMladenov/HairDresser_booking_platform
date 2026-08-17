import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AvailabilityCalendarResponse, AvailabilityResponse } from '@booking/shared';
import { AvailabilityService } from './availability.service';
import { AvailabilityCalendarQueryDto, AvailabilityQueryDto } from './dto/availability-query.dto';

@ApiTags('public')
@Controller('availability')
export class PublicAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'Free start times for one service on one day',
    description:
      'Returns only times that are fully bookable for the whole service duration. No information about existing appointments is exposed.',
  })
  getDay(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResponse> {
    return this.availability.getDay(query.serviceId, query.date);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Which upcoming days have at least one free slot' })
  getCalendar(
    @Query() query: AvailabilityCalendarQueryDto,
  ): Promise<AvailabilityCalendarResponse> {
    return this.availability.getCalendar(query.serviceId, query.from, query.days ?? 14);
  }
}
