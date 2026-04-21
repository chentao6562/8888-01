import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '@/modules/audit/audit.service';

export const AUDIT_KEY = 'auditAction';
/**
 * 装饰器：标记需要审计的关键动作。
 * @example  `@Audit('contract.sign')`
 */
export const Audit = (action: string) => SetMetadata(AUDIT_KEY, action);

/**
 * 全局审计拦截器。
 *  - 仅当 `@Audit('xxx')` 装饰过的 handler 才落库
 *  - 失败时也会落一条带 detail=`error: ...` 的记录
 *  - 不阻塞主流程（落库异步、错误吞掉）
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!action) return next.handle();

    const req = ctx.switchToHttp().getRequest<
      Request & { user?: { tenantId?: string; userId?: string; staffId?: string }; tenantId?: string }
    >();
    const ip = (req.ip ?? '').replace(/^::ffff:/, '');
    const ua = req.headers['user-agent']?.toString().slice(0, 200) ?? null;
    const u = req.user;

    return next.handle().pipe(
      tap({
        next: () => {
          this.audit.log({
            tenantId: u?.tenantId ?? req.tenantId ?? null,
            userId: u?.userId ?? null,
            staffId: u?.staffId ?? null,
            action,
            detail: `${req.method} ${req.url}`,
            ip: ip || null,
            userAgent: ua,
          }).catch(() => undefined);
        },
        error: (err) => {
          this.audit.log({
            tenantId: u?.tenantId ?? req.tenantId ?? null,
            userId: u?.userId ?? null,
            staffId: u?.staffId ?? null,
            action: `${action}.failed`,
            detail: String((err as Error)?.message ?? err).slice(0, 200),
            ip: ip || null,
            userAgent: ua,
          }).catch(() => undefined);
        },
      }),
    );
  }
}
