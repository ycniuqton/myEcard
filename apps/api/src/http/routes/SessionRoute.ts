import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** GET /session and POST /session/day. */
export class SessionRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get('/session', async req => this.c.session.plan(this.parse(Schemas.session, req.query).date))
    api.post('/session/day', async req => this.c.progress.updateDay(this.parse(Schemas.day, req.body)))
  }
}
