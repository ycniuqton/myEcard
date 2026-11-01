import type { ErrorCode } from '@wordmap/shared'
import { ApiConfig, ApiErrorKind } from './ApiConfig'

/** Single error type thrown by ApiClient for network, timeout, HTTP and parse failures. */
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status: number = ApiConfig.NO_STATUS,
    readonly code: ErrorCode | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isOffline(): boolean {
    return this.kind === ApiErrorKind.Network || this.kind === ApiErrorKind.Timeout
  }

  get isRetryable(): boolean {
    return this.isOffline || this.status >= ApiConfig.HTTP_SERVER_ERROR
  }
}
