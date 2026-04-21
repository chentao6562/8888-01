import { SetMetadata } from '@nestjs/common';
import type { StaffRole } from '@/modules/staff/entities/staff.entity';

export const ROLES_KEY = 'allowedRoles';

/** 角色白名单。未标注视为任意已登录角色可访问。 */
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
