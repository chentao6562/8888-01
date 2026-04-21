import type { StaffRole } from '@/modules/staff/entities/staff.entity';

/** Web 管理端 JWT 解码后注入 req.user 的结构。 */
export interface RequestUser {
  userId: string;
  staffId: string;
  tenantId: string;
  role: StaffRole;
}

/** 小程序客户端（phase 7 起）JWT 解码后注入 req.user 的结构。 */
export interface ClientRequestUser {
  customerUserId: string;
  customerId: string;
  tenantId: string;
  role: 'customer';
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends RequestUser {}
  }
}
