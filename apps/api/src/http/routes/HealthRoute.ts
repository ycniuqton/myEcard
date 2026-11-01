import type { FastifyInstance } from 'fastify'
import type { HealthResponse } from '@wordmap/shared'
import { BaseRoute } from '../BaseRoute'

/** GET /health. */
export class HealthRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get('/health', async (): Promise<HealthResponse> => ({ ok: true, contentVersion: this.c.content.version }))
  }
}
