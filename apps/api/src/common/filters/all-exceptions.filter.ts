import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiErrorCode, type ApiErrorBody } from '@booking/shared';
import type { Request, Response } from 'express';
import { AppConfig } from '../../config/app-config';
import {
  isCheckViolation,
  isOverlapViolation,
  isRecordNotFound,
  isUniqueViolation,
} from '../errors/database-errors';

/**
 * Single place where every error becomes an HTTP response. Clients always get
 * the same JSON shape, and internal details never leak in production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly config: AppConfig) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const body = this.toErrorBody(exception);
    // The wire contract types statusCode as a plain number; naming it as Nest's
    // enum here keeps the comparisons below readable.
    const status: HttpStatus = body.statusCode;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Only server faults deserve a stack trace in the logs.
      this.logger.error(
        `${request.method} ${request.originalUrl} failed: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status === HttpStatus.FORBIDDEN || status === HttpStatus.UNAUTHORIZED) {
      this.logger.warn(`${request.method} ${request.originalUrl} -> ${status}`);
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    // Database constraint violations that reached this far mean the application
    // layer missed a case; the constraint is what saved us.
    if (isOverlapViolation(exception)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        code: ApiErrorCode.SLOT_TAKEN,
        message: 'That time has just been booked. Please choose another slot.',
      };
    }

    if (isUniqueViolation(exception)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        code: ApiErrorCode.CONFLICT,
        message: 'A record with these details already exists.',
      };
    }

    if (isCheckViolation(exception)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'The submitted values are not valid.',
      };
    }

    if (isRecordNotFound(exception)) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: ApiErrorCode.NOT_FOUND,
        message: 'Resource not found.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ApiErrorCode.INTERNAL,
      message: this.config.isProduction
        ? 'Something went wrong. Please try again.'
        : `Unhandled error: ${exception instanceof Error ? exception.message : String(exception)}`,
    };
  }

  private fromHttpException(exception: HttpException): ApiErrorBody {
    const status: HttpStatus = exception.getStatus();
    const payload = exception.getResponse();

    // Errors thrown as ApiException already carry the final shape.
    if (this.isApiErrorBody(payload)) {
      return payload;
    }

    // ValidationPipe reports an array of human-readable field messages.
    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      const rawMessage = record.message;
      const details = Array.isArray(rawMessage) ? rawMessage.map(String) : undefined;

      return {
        statusCode: status,
        code: this.codeForStatus(status),
        message: details
          ? 'Some of the submitted values are not valid.'
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message,
        ...(details ? { details } : {}),
      };
    }

    return {
      statusCode: status,
      code: this.codeForStatus(status),
      message: typeof payload === 'string' ? payload : exception.message,
    };
  }

  private codeForStatus(status: HttpStatus): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.RATE_LIMITED;
      default:
        return status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? ApiErrorCode.INTERNAL
          : ApiErrorCode.VALIDATION_FAILED;
    }
  }

  private isApiErrorBody(payload: unknown): payload is ApiErrorBody {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      'statusCode' in payload &&
      'message' in payload
    );
  }
}
