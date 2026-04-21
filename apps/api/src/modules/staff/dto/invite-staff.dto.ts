import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StaffRole } from '../entities/staff.entity';

export class InviteStaffDto {
  @ApiProperty({ example: '张三' })
  @IsString()
  @Length(2, 60)
  name!: string;

  @ApiProperty({ example: '13800001234' })
  @Matches(/^1[3-9]\d{9}$/, { message: 'phone 必须为 11 位手机号' })
  phone!: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: ['pm', 'strategist', 'creator', 'adops'] })
  @IsIn(['pm', 'strategist', 'creator', 'adops'])
  role!: Exclude<StaffRole, 'admin'>;
}
