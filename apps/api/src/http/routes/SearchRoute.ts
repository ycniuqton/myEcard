import type { FastifyInstance } from 'fastify'
import type { SearchResponse } from '@wordmap/shared'
import { BaseRoute } from '../BaseRoute'
import { SearchLimits } from '../../services/ContentManager'
import { Schemas } from '../Schemas'

/** GET /words/search. */
export class SearchRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get('/words/search', async (req): Promise<SearchResponse> => {
      const { q, limit } = this.parse(Schemas.search, req.query)
      return this.scope(req).search.search(q, limit ?? SearchLimits.DEFAULT)
    })
  }
}
