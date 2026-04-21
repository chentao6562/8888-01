import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { MonthlySections } from '../reports.service';

export class UpdateReportDto {
  @ApiPropertyOptional({ description: 'PM 修订后的最终内容' })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  finalContent?: string;

  @ApiPropertyOptional({ description: '6 段结构化数据' })
  @IsOptional()
  @IsObject()
  sections?: MonthlySections;
}

export class GenerateReportDto {
  @IsString()
  @MaxLength(36)
  customerId!: string;

  @IsString()
  @MaxLength(7)
  month!: string;
}
