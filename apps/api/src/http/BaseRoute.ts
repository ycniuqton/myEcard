import type { FastifyInstance } from 'fastify'
import type { ZodTypeAny, z } from 'zod'
import type { Container } from '../Container'

/** Base class of every resource route; subclasses register their endpoints on the API scope. */
export abstract class BaseRoute {
  constructor(protected readonly c: Container) {}

  abstract register(api: FastifyInstance): void

  protected parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
    return schema.parse(data)
  }
}
