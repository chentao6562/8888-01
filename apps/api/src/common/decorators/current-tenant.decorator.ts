import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 注入当前 tenantId。 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId as string;
  },
);
