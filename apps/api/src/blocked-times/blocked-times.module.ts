import { Module } from '@nestjs/common';
import { AdminBlockedTimesController } from './admin-blocked-times.controller';
import { BlockedTimesService } from './blocked-times.service';

@Module({
  controllers: [AdminBlockedTimesController],
  providers: [BlockedTimesService],
  exports: [BlockedTimesService],
})
export class BlockedTimesModule {}
