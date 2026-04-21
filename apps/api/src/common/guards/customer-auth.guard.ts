import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * 客户端专属 guard。用在 /api/v1/client/* 端点上。
 * 要求 JWT 中 role === 'customer'。
 */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | { role: string; tenantId: string; customerId?: string; customerUserId?: string }
      | undefined;
    if (!user || user.role !== 'customer') {
      throw new ForbiddenException({
        code: 'NOT_CUSTOMER',
        message: '仅小程序客户端可访问',
      });
    }
    req.tenantId = user.tenantId;
    req.customerId = user.customerId;
    req.customerUserId = user.customerUserId;
    return true;
  }
}
