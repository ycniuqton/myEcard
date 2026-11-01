import { ErrorCode, type ApiErrorBody } from '@wordmap/shared'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError, HttpStatus } from '../services/AppError'

export class ErrorMessages {
  static readonly INTERNAL = 'Internal server error'
  static readonly BODY_PATH = 'body'
  static readonly PATH_SEPARATOR = '.'
  static readonly ISSUE_SEPARATOR = '; '
}

/** Maps every thrown error to the uniform { error: { code, message } } body. */
export class ErrorHandler {
  handle = (error: FastifyError | Error, _req: FastifyRequest, reply: FastifyReply): void => {
    const { status, body } = this.describe(error)
    void reply.status(status).send(body)
  }

  notFound(message: string): { status: number; body: ApiErrorBody } {
    return this.body(HttpStatus.NOT_FOUND, ErrorCode.NotFound, message)
  }

  private describe(error: FastifyError | Error): { status: number; body: ApiErrorBody } {
    if (error instanceof AppError) return this.body(error.status, error.code, error.message)
    if (error instanceof ZodError) return this.body(HttpStatus.BAD_REQUEST, ErrorCode.Validation, this.zodMessage(error))
    const status = (error as FastifyError).statusCode
    if (status && status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL) {
      return this.body(HttpStatus.BAD_REQUEST, ErrorCode.Validation, error.message)
    }
    return this.body(HttpStatus.INTERNAL, ErrorCode.Internal, ErrorMessages.INTERNAL)
  }

  private zodMessage(error: ZodError): string {
    return error.issues.map(i => `${i.path.join(ErrorMessages.PATH_SEPARATOR) || ErrorMessages.BODY_PATH}: ${i.message}`).join(ErrorMessages.ISSUE_SEPARATOR)
  }

  private body(status: number, code: ErrorCode, message: string): { status: number; body: ApiErrorBody } {
    return { status, body: { error: { code, message } } }
  }
}
