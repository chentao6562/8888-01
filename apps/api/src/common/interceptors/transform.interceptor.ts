import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * 响应体封装：把控制器返回的 X 包装成 { data: X }，对齐 api-conventions §4.4。
 * 若控制器已返回 { data: ... } 或 { error: ... }，则原样透传。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T } | T> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<{ data: T } | T> {
    return next.handle().pipe(
      map((value) => {
        if (value && typeof value === 'object' && ('data' in value || 'error' in value)) {
          return value as T;
        }
        return { data: value };
      }),
    );
  }
}
