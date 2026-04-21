import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { StaffRole, StaffStatus } from '../entities/staff.entity';

export class UpdateStaffDto {
  @ApiPropertyOptional({ enum: ['admin', 'pm', 'strategist', 'creator', 'adops'] })
  @IsOptional()
  @IsIn(['admin', 'pm', 'strategist', 'creator', 'adops'])
  role?: StaffRole;

  @ApiPropertyOptional({ enum: ['active', 'disabled'] })
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: Exclude<StaffStatus, 'invited'>;
}
