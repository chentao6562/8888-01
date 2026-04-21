import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BudgetHint, LeadSource } from '../entities/customer.entity';

export class CreateCustomerDto {
  @ApiProperty({ example: '呼市金辉家居' })
  @IsString()
  @Length(2, 120)
  companyName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 120)
  shopName?: string;

  @ApiProperty({ example: '张总' })
  @IsString()
  @Length(2, 60)
  bossName!: string;

  @ApiProperty({ example: '13800001234' })
  @Matches(/^1[3-9]\d{9}$/)
  bossPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bossWechat?: string;

  @ApiProperty({ example: '家居零售' })
  @IsString()
  @Length(2, 40)
  industry!: string;

  @ApiPropertyOptional({ example: '内蒙古呼和浩特 · 金桥开发区' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  storeCount?: number;

  @ApiPropertyOptional({ enum: ['referral', 'website', 'outreach', 'ad', 'other'] })
  @IsOptional()
  @IsIn(['referral', 'website', 'outreach', 'ad', 'other'])
  source?: LeadSource;

  @ApiPropertyOptional({ enum: ['lt_5k', '5k_10k', '10k_30k', 'gt_30k', 'unknown'] })
  @IsOptional()
  @IsIn(['lt_5k', '5k_10k', '10k_30k', 'gt_30k', 'unknown'])
  budgetHint?: BudgetHint;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ description: '初始 PM staffId（留空则自动分配）' })
  @IsOptional()
  @IsString()
  pmId?: string;

  @ApiPropertyOptional({ description: '初始策划 staffId（留空则自动分配）' })
  @IsOptional()
  @IsString()
  strategistId?: string;
}
