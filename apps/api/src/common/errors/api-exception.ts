import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode, type ApiErrorBody } from '@booking/shared';

/**
 * Application error carrying a stable machine-readable code alongside the HTTP
 * status, so the frontend can react to specific situations (a slot being taken,
 * for example) without string-matching messages.
 */
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ApiErrorCode, message: string, details?: string[]) {
    const body: ApiErrorBody = { statusCode: status, code, message, ...(details ? { details } : {}) };
    super(body, status);
  }

  static notFound(message = 'Resource not found'): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, message);
  }

  static badRequest(message: string, details?: string[]): ApiException {
    return new ApiException(
      HttpStatus.BAD_REQUEST,
      ApiErrorCode.VALIDATION_FAILED,
      message,
      details,
    );
  }

  static unauthorized(message = 'Authentication required'): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You are not allowed to perform this action'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, message);
  }

  static conflict(message: string): ApiException {
    return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.CONFLICT, message);
  }

  /** The requested time is not offered: outside working hours, blocked, too soon. */
  static slotUnavailable(message: string): ApiException {
    return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.SLOT_UNAVAILABLE, message);
  }

  /** The time was offered but someone else booked it first. */
  static slotTaken(message = 'That time has just been booked. Please choose another slot.') {
    return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.SLOT_TAKEN, message);
  }

  static serviceInactive(message = 'This service is not currently offered'): ApiException {
    return new ApiException(HttpStatus.CONFLICT, ApiErrorCode.SERVICE_INACTIVE, message);
  }

  static invalidStatusTransition(message: string): ApiException {
    return new ApiException(
      HttpStatus.CONFLICT,
      ApiErrorCode.INVALID_STATUS_TRANSITION,
      message,
    );
  }

  static csrfFailed(message = 'Request rejected for security reasons'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, ApiErrorCode.CSRF_FAILED, message);
  }
}
