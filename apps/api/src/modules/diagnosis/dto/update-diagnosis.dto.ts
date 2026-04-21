import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDiagnosisDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) preInterviewAnswers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) knifeSelf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) knifeEmployee?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) knifeOldCustomer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) knifeCompetitor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) card1Sells?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) card2CustomerMind?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) card3ProductVideo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) card4WhyNotNext?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50_000) reportContent?: string;
}
