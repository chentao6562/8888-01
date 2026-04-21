import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';

/**
 * 租户守卫：所有通过 JWT 鉴权的请求，自动把 tenantId 注入到 req。
 * 下游 service 通过 CurrentTenant 或 req.tenantId 拿到。
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user?.tenantId) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '租户上下文缺失' });
    }
    req.tenantId = user.tenantId;
    return true;
  }
}
