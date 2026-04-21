import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import type { RequestUser } from '@/common/types/request-user';
import type { StaffRole } from '@/modules/staff/entities/staff.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<StaffRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed || allowed.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '请先登录' });
    }
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `需要角色：${allowed.join(' / ')}`,
      });
    }
    return true;
  }
}
