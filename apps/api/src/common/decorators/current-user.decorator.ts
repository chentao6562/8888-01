import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';

/** 参数装饰器：注入当前登录用户（从 JWT 解析）。 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as RequestUser;
  },
);
