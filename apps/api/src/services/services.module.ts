import { Module } from '@nestjs/common';
import { AdminServicesController } from './admin-services.controller';
import { PublicServicesController } from './public-services.controller';
import { ServiceCatalogService } from './service-catalog.service';

@Module({
  controllers: [PublicServicesController, AdminServicesController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServicesModule {}
