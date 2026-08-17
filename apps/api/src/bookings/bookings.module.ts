import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { ServicesModule } from '../services/services.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsService } from './bookings.service';
import { PublicBookingsController } from './public-bookings.controller';

@Module({
  imports: [AvailabilityModule, ServicesModule],
  controllers: [PublicBookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
