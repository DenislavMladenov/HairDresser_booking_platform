import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicService } from '@booking/shared';
import { ServiceCatalogService } from './service-catalog.service';

@ApiTags('public')
@Controller('services')
export class PublicServicesController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Lists bookable services' })
  list(): Promise<PublicService[]> {
    return this.catalog.listActive();
  }
}
