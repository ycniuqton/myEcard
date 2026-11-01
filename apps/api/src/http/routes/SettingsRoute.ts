import type { FastifyInstance } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

/** PUT /settings (partial body). */
export class SettingsRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.put('/settings', async req => this.scope(req).settings.update(this.parse(Schemas.settingsPatch, req.body)))
  }
}
