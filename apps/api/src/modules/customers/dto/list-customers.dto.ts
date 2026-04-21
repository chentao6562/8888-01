import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { CustomerStage } from '../entities/customer.entity';

const STAGES = [
  'lead',
  'diagnosing',
  'proposing',
  'signed',
  'delivering',
  'reviewing',
  'renewing',
  'churned',
] as const;

export class ListCustomersDto {
  @ApiPropertyOptional({ enum: STAGES })
  @IsOptional()
  @IsIn(STAGES as unknown as CustomerStage[])
  stage?: CustomerStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: '按客户名 / 行业 / 老板 模糊' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
