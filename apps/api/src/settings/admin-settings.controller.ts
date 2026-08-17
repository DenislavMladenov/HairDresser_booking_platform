import { Body, Get, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { BookingSettingsDto } from '@booking/shared';
import { AdminController } from '../common/decorators/admin-controller.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@AdminController('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Reads the booking policy' })
  get(): Promise<BookingSettingsDto> {
    return this.settings.get();
  }

  @Put()
  @ApiOperation({ summary: 'Updates the booking policy' })
  update(@Body() dto: UpdateSettingsDto): Promise<BookingSettingsDto> {
    return this.settings.update(dto);
  }
}
