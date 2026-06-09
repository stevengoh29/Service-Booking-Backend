import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * LoggingInterceptor logs the incoming HTTP request metadata and the response payload.
 * It can be registered globally to monitor all controller routes.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, body, query, params, headers } = request;
    const requestId = request.headers['x-request-id'] || Date.now();

    // Log request details (excluding potentially large headers/body for brevity)
    this.logger.log(
      `[REQ - ${requestId}] | ${method} | ${url} - query: ${JSON.stringify(query)} - params: ${JSON.stringify(params)} - body: ${JSON.stringify(body)}`,
    );

    // const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        // const duration = Date.now() - now;
        this.logger.log(
          `[RES - ${requestId}] | ${method} - ${response.statusCode} | ${url}`,
        );
      }),
    );
  }
}
