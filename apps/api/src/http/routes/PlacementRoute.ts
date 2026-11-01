import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** POST /placement. */
export class PlacementRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.post('/placement', async req => this.scope(req).placement.apply(this.parse(Schemas.placement, req.body)))
  }
}
