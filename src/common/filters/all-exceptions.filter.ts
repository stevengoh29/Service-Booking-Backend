import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = this.getErrorMessage(exception, errorResponse);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[ERR] ${request.method} ${request.originalUrl ?? request.url} - ${status} - ${message}`,
      stack,
    );

    if (response.headersSent) {
      return;
    }

    response.status(status).json(
      typeof errorResponse === 'object' && errorResponse !== null
        ? errorResponse
        : {
            statusCode: status,
            message,
          },
    );
  }

  private getErrorMessage(
    exception: unknown,
    errorResponse: string | object | undefined,
  ): string {
    if (exception instanceof Error) {
      return exception.message;
    }

    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    if (
      errorResponse &&
      typeof errorResponse === 'object' &&
      'message' in errorResponse
    ) {
      const message = errorResponse.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }

    return 'Internal server error';
  }
}
