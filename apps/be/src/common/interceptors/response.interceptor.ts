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

// Wraps every response this runs on into the shared { statusCode, message,
// data, timestamp } envelope. Scoped per-controller via
// `@UseInterceptors(ResponseInterceptor)` for now - the same class can be
// passed to `app.useGlobalInterceptors()` later to cover every route.
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_KEY,
        context.getHandler(),
      ) ?? 'Request successful';

    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        message,
        data: (data ?? null) as T,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
