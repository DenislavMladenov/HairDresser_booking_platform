import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logs one line per request. Deliberately records only method, path, status and
 * duration: request bodies and cookies contain customer data and credentials.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    // Prefer the matched route pattern so URLs with ids do not create unbounded
    // log variety. Express types `route` as any, hence the explicit narrowing.
    const matchedRoute = (request.route as { path?: string } | undefined)?.path;
    const route = matchedRoute ?? request.path;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${request.method} ${route} ${response.statusCode} ${Date.now() - startedAt}ms`,
          );
        },
        error: () => {
          this.logger.warn(`${request.method} ${route} failed after ${Date.now() - startedAt}ms`);
        },
      }),
    );
  }
}
