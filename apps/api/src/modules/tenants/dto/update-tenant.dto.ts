import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: '呼市老彭代运营' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  logo?: string;

  @ApiPropertyOptional({ example: '13800001234' })
  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/, { message: 'contactPhone 必须为 11 位手机号' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'boss@example.com' })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  contactEmail?: string;
}
