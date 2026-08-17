import { Module } from '@nestjs/common';
import { AdminWorkingHoursController } from './admin-working-hours.controller';
import { WorkingHoursService } from './working-hours.service';

@Module({
  controllers: [AdminWorkingHoursController],
  providers: [WorkingHoursService],
  exports: [WorkingHoursService],
})
export class WorkingHoursModule {}
