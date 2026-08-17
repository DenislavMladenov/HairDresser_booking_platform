import { Module } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
