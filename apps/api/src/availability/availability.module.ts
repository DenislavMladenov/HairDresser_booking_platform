import { Module } from '@nestjs/common';
import { BlockedTimesModule } from '../blocked-times/blocked-times.module';
import { ServicesModule } from '../services/services.module';
import { SettingsModule } from '../settings/settings.module';
import { WorkingHoursModule } from '../working-hours/working-hours.module';
import { AvailabilityService } from './availability.service';
import { PublicAvailabilityController } from './public-availability.controller';

@Module({
  imports: [ServicesModule, WorkingHoursModule, SettingsModule, BlockedTimesModule],
  controllers: [PublicAvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
