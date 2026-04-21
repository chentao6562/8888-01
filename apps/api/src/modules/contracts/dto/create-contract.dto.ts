import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PaymentDueInput {
  @ApiProperty({ enum: ['plan', 'shoot', 'edit', 'final'] })
  @IsString()
  stage!: 'plan' | 'shoot' | 'edit' | 'final';

  @ApiProperty({ example: '2026-05-01T00:00:00Z' })
  @IsDateString()
  dueAt!: string;
}

export class CreateContractDto {
  @ApiProperty({ description: '基于哪个方案' })
  @IsString()
  proposalId!: string;

  @ApiPropertyOptional({ description: '模板 id（可留空自动选首个）' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: '合同总金额（分），默认取方案报价' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: '四笔付款到期日。按顺序 plan/shoot/edit/final',
    type: [PaymentDueInput],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDueInput)
  paymentDueDates?: PaymentDueInput[];
}
