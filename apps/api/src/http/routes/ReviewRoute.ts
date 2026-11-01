import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** POST /reviews (idempotent on clientId). */
export class ReviewRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.post('/reviews', async req => this.scope(req).progress.review(this.parse(Schemas.review, req.body)))
  }
}
