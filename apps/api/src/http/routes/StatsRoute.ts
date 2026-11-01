import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** GET /stats. */
export class StatsRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get('/stats', async req => this.scope(req).stats.compute(this.parse(Schemas.stats, req.query).date))
  }
}
