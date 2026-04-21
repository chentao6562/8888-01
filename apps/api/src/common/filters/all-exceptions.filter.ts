import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    traceId?: string;
  };
}

/**
 * 全局异常过滤器。把所有异常转换成 api-conventions §4.4 约定的错误响应结构：
 * { error: { code, message, details?, traceId? } }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.toErrorBody(exception, status);
    const traceId = request.headers['x-request-id']?.toString();
    if (traceId) body.error.traceId = traceId;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${body.error.code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private toErrorBody(exception: unknown, status: number): ErrorBody {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { error: { code: this.codeFromStatus(status), message: response } };
      }
      const r = response as Record<string, unknown>;
      return {
        error: {
          code: (r.code as string) ?? this.codeFromStatus(status),
          message: (r.message as string) ?? exception.message,
          details: r.details as Record<string, unknown> | undefined,
        },
      };
    }

    const isProd = process.env.NODE_ENV === 'production';
    return {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isProd
          ? '服务异常，请稍后重试'
          : exception instanceof Error ? exception.message : 'Unknown error',
      },
    };
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_FAILED',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }
}
