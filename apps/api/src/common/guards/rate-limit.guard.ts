import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export interface RateLimitOptions {
  /** 时间窗口（秒） */
  windowSec: number;
  /** 窗口内允许次数 */
  max: number;
  /** 自定义 key prefix（默认 route path） */
  keyPrefix?: string;
}

export const RATE_LIMIT_KEY = 'rateLimit';

/** 装饰器：`@RateLimit({ windowSec: 60, max: 5 })` */
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);

interface Bucket { count: number; expiresAt: number }

/**
 * 内存版限流（按 IP × route）。MVP 单实例够用。
 * Phase 8 多副本 / 生产推荐换 Redis 后端（同接口签名替换实现）。
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!opts) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
    const route = opts.keyPrefix ?? `${req.method}:${req.route?.path ?? req.path}`;
    const key = `${ip}|${route}`;

    const now = Date.now();
    if (now - this.lastSweep > 60_000) this.sweep(now);

    const b = this.buckets.get(key);
    if (!b || b.expiresAt < now) {
      this.buckets.set(key, { count: 1, expiresAt: now + opts.windowSec * 1000 });
      return true;
    }
    b.count++;
    if (b.count > opts.max) {
      const retryAfter = Math.ceil((b.expiresAt - now) / 1000);
      const res = ctx.switchToHttp().getResponse<{ setHeader?: (k: string, v: string) => void }>();
      res.setHeader?.('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: `请求过于频繁，请 ${retryAfter}s 后重试`,
          details: { retryAfter },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private sweep(now: number) {
    let removed = 0;
    for (const [k, b] of this.buckets) {
      if (b.expiresAt < now) { this.buckets.delete(k); removed++; }
    }
    this.lastSweep = now;
    if (removed > 0) this.logger.debug(`rate-limit sweep removed ${removed} buckets`);
  }
}
