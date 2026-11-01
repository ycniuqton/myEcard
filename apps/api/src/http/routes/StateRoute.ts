import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'

/** GET /state. */
export class StateRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get('/state', async () => this.c.progress.state())
  }
}
