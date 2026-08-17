import { Body, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { AdminService } from '@booking/shared';
import { AdminController } from '../common/decorators/admin-controller.decorator';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceCatalogService } from './service-catalog.service';

@AdminController('admin/services')
export class AdminServicesController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Lists all services, including disabled ones' })
  list(): Promise<AdminService[]> {
    return this.catalog.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Reads one service' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminService> {
    return this.catalog.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Creates a service' })
  create(@Body() dto: CreateServiceDto): Promise<AdminService> {
    return this.catalog.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Updates a service',
    description:
      'Disabling a service hides it from customers but keeps existing appointments intact.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<AdminService> {
    return this.catalog.update(id, dto);
  }
}
