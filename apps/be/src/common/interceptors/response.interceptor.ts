import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';
import type { ApiResponse } from '../interfaces/api-response.interface.js';
import { PaginatedResult } from '../interfaces/paginated-result.js';

// Wraps every response this runs on into the shared { statusCode, message,
// data, timestamp } envelope. When the handler returns a PaginatedResult,
// its items become `data` and a `pagination` block is added.
// Scoped per-controller via `@UseInterceptors(ResponseInterceptor)` for now -
// the same class can be passed to `app.useGlobalInterceptors()` later to
// cover every route.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<unknown>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      'Request successful';

    return next.handle().pipe(
      map((data) => {
        const statusCode = context.switchToHttp().getResponse().statusCode;
        const timestamp = new Date().toISOString();

        if (data instanceof PaginatedResult) {
          return {
            statusCode,
            message,
            data: data.items,
            pagination: data.pagination,
            timestamp,
          };
        }

        return { statusCode, message, data: data ?? null, timestamp };
      }),
    );
  }
}
