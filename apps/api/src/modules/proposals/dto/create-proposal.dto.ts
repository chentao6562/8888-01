import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PackageTier } from '../entities/package.entity';

const TIERS: PackageTier[] = ['starter_pack', 'monthly_package', 'annual_partner'];

export class CreateProposalDto {
  @ApiProperty({ enum: TIERS })
  @IsIn(TIERS)
  planTier!: PackageTier;

  @ApiPropertyOptional({ description: '可选：来自官方/私库模板 id' })
  @IsOptional()
  @IsString()
  packageId?: string;

  @ApiPropertyOptional({ description: '地区系数（0.8~1.5），默认 1.0' })
  @IsOptional()
  regionFactor?: number;
}

export class CalculateQuoteDto {
  @ApiProperty({ enum: TIERS })
  @IsIn(TIERS)
  planTier!: PackageTier;

  @ApiPropertyOptional({ description: '地区系数' })
  @IsOptional()
  regionFactor?: number;

  @ApiPropertyOptional({
    description: '定制项 [{name, amount(分)}]',
    type: 'array',
    items: { type: 'object', properties: { name: { type: 'string' }, amount: { type: 'integer' } } },
  })
  @IsOptional()
  customItems?: { name: string; amount: number }[];
}

export class UpdateProposalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) onePager?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) content?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priceQuote?: number;

  @ApiPropertyOptional() @IsOptional() regionFactor?: number;
  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  customItems?: { name: string; amount: number }[];
}
