import { PartialType } from '@nestjs/swagger';
import type { UpdateServiceRequest } from '@booking/shared';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) implements UpdateServiceRequest {}
