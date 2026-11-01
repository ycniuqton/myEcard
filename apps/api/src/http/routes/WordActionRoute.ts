import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** POST /words/:id/know | learn | reset. */
export class WordActionRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.post('/words/:id/know', async req => this.c.progress.know(this.id(req.params)))
    api.post('/words/:id/learn', async req => this.c.progress.learn(this.id(req.params)))
    api.post('/words/:id/reset', async req => this.c.progress.reset(this.id(req.params)))
  }

  private id(params: unknown): string {
    return this.parse(Schemas.wordParams, params).id
  }
}
