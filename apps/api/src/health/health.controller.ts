import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('public')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Used by the container health check, so it must touch the database. */
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity probe' })
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up' };
  }
}
