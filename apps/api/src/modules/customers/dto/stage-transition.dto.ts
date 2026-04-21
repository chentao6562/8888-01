import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CustomerStage } from '../entities/customer.entity';

const STAGES: CustomerStage[] = [
  'lead',
  'diagnosing',
  'proposing',
  'signed',
  'delivering',
  'reviewing',
  'renewing',
  'churned',
];

export class StageTransitionDto {
  @ApiProperty({ enum: STAGES })
  @IsIn(STAGES)
  to!: CustomerStage;
}
