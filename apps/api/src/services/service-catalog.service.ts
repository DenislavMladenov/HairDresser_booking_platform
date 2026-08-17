import { Injectable } from '@nestjs/common';
import type { AdminService, PublicService } from '@booking/shared';
import { ApiException } from '../common/errors/api-exception';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import type { ServiceModel } from '../generated/prisma/models';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  /** Public catalogue: active services only, ordered for display. */
  async listActive(): Promise<PublicService[]> {
    const rows = await this.prisma.service.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.toPublic(row));
  }

  async listAll(): Promise<AdminService[]> {
    const rows = await this.prisma.service.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.toAdmin(row));
  }

  async getById(id: string): Promise<AdminService> {
    return this.toAdmin(await this.findOrThrow(id));
  }

  /**
   * Used when creating a booking. A disabled service must not be bookable even
   * if a stale page still lists it.
   */
  async getBookableOrThrow(id: string): Promise<ServiceModel> {
    const service = await this.findOrThrow(id);

    if (!service.active) {
      throw ApiException.serviceInactive();
    }

    return service;
  }

  async create(dto: CreateServiceDto): Promise<AdminService> {
    const created = await this.prisma.service.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        durationMinutes: dto.durationMinutes,
        price: dto.price,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return this.toAdmin(created);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<AdminService> {
    await this.findOrThrow(id);

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() ?? null } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.toAdmin(updated);
  }

  private async findOrThrow(id: string): Promise<ServiceModel> {
    const service = await this.prisma.service.findUnique({ where: { id } });

    if (!service) {
      throw ApiException.notFound('Service not found.');
    }

    return service;
  }

  private toPublic(row: ServiceModel): PublicService {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      durationMinutes: row.durationMinutes,
      price: row.price.toFixed(2),
      currency: this.config.currency,
    };
  }

  private toAdmin(row: ServiceModel): AdminService {
    return {
      ...this.toPublic(row),
      active: row.active,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
