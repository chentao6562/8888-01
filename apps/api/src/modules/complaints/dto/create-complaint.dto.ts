import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ComplaintSeverity } from '../entities/complaint.entity';

export class CreateComplaintDto {
  @ApiProperty()
  @IsString()
  @MaxLength(36)
  customerId!: string;

  @ApiPropertyOptional({ enum: ['low', 'mid', 'high'] })
  @IsOptional()
  @IsIn(['low', 'mid', 'high'])
  severity?: ComplaintSeverity;

  @ApiProperty({ description: '投诉内容', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  content!: string;
}

export class HandleComplaintDto {
  @ApiProperty({ description: '处理方案', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  resolution!: string;
}
