import { ErrorCode } from '@wordmap/shared'

export class HttpStatus {
  static readonly OK = 200
  static readonly NOT_MODIFIED = 304
  static readonly BAD_REQUEST = 400
  static readonly UNAUTHORIZED = 401
  static readonly NOT_FOUND = 404
  static readonly CONFLICT = 409
  static readonly INTERNAL = 500
}

/** Domain error carrying the API error code and its HTTP status. */
export class AppError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly status: number) {
    super(message)
  }

  static notFound(message: string): AppError {
    return new AppError(ErrorCode.NotFound, message, HttpStatus.NOT_FOUND)
  }

  static unauthenticated(message: string): AppError {
    return new AppError(ErrorCode.Unauthenticated, message, HttpStatus.UNAUTHORIZED)
  }

  static validation(message: string): AppError {
    return new AppError(ErrorCode.Validation, message, HttpStatus.BAD_REQUEST)
  }
}
