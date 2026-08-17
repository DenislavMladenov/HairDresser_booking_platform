import { Body, Get, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { WorkingHoursResponse } from '@booking/shared';
import { AdminController } from '../common/decorators/admin-controller.decorator';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { WorkingHoursService } from './working-hours.service';

@AdminController('admin/working-hours')
export class AdminWorkingHoursController {
  constructor(private readonly workingHours: WorkingHoursService) {}

  @Get()
  @ApiOperation({ summary: 'Reads the weekly schedule, including breaks' })
  get(): Promise<WorkingHoursResponse> {
    return this.workingHours.getWeek();
  }

  @Put()
  @ApiOperation({
    summary: 'Replaces the weekly schedule',
    description: 'All seven days are supplied at once so the update is atomic.',
  })
  replace(@Body() dto: UpdateWorkingHoursDto): Promise<WorkingHoursResponse> {
    return this.workingHours.replaceWeek(dto);
  }
}
