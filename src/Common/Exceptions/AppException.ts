import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../Constants/ErrorCode';

export class AppException extends Error {
  public readonly StatusCode: number;
  public readonly ErrorCode: ErrorCode;
  public readonly Details?: unknown;

  constructor(message: string, statusCode: number, errorCode: ErrorCode, details?: unknown) {
    super(message);
    this.StatusCode = statusCode;
    this.ErrorCode = errorCode;
    this.Details = details;
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Not found', details?: unknown) {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.NotFound, details);
  }
}

export class ConflictException extends AppException {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, HttpStatus.CONFLICT, ErrorCode.Conflict, details);
  }
}

export class UnauthorizedAppException extends AppException {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.Unauthorized, details);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.Forbidden, details);
  }
}

export class BusinessRuleException extends AppException {
  constructor(message = 'Business rule violation', details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.BusinessRule, details);
  }
}
