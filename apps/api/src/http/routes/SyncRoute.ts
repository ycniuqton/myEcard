import type { FastifyInstance } from 'fastify'
import type { SyncPayload } from '@wordmap/shared'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** POST /sync. */
export class SyncRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.post('/sync', async req => this.c.sync.sync(this.parse(Schemas.sync, req.body) as SyncPayload))
  }
}
