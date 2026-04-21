import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TenantPlan } from '@/modules/tenants/entities/tenant.entity';

export class RegisterTenantDto {
  // 公司信息
  @ApiProperty({ example: '呼市老彭代运营' })
  @IsString()
  @Length(2, 120)
  companyName!: string;

  @ApiProperty({ enum: ['basic', 'pro', 'enterprise'], example: 'basic' })
  @IsIn(['basic', 'pro', 'enterprise'])
  plan!: TenantPlan;

  @ApiPropertyOptional({ example: 'boss@example.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  // 创始管理员信息
  @ApiProperty({ example: '老彭' })
  @IsString()
  @Length(2, 60)
  adminName!: string;

  @ApiProperty({ example: '13800001234', description: '11 位手机号' })
  @Matches(/^1[3-9]\d{9}$/, { message: 'phone 必须为 11 位手机号' })
  phone!: string;

  @ApiProperty({ example: 'P@ssw0rd', description: '≥ 8 位，含字母与数字' })
  @IsString()
  @Length(8, 64)
  @Matches(/[A-Za-z]/, { message: '密码需包含字母' })
  @Matches(/\d/, { message: '密码需包含数字' })
  password!: string;
}
