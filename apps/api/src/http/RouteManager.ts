import type { FastifyInstance } from 'fastify'
import type { Container } from '../Container'
import type { BaseRoute } from './BaseRoute'
import type { AuthGuard } from './auth/AuthGuard'
import { ContentRoute } from './routes/ContentRoute'
import { DataTransferRoute } from './routes/DataTransferRoute'
import { HealthRoute } from './routes/HealthRoute'
import { PlacementRoute } from './routes/PlacementRoute'
import { ReviewRoute } from './routes/ReviewRoute'
import { SearchRoute } from './routes/SearchRoute'
import { SessionRoute } from './routes/SessionRoute'
import { SettingsRoute } from './routes/SettingsRoute'
import { StateRoute } from './routes/StateRoute'
import { StatsRoute } from './routes/StatsRoute'
import { SyncRoute } from './routes/SyncRoute'
import { WordActionRoute } from './routes/WordActionRoute'

export class ApiPrefix {
  static readonly VALUE = '/api'
}

export enum ApiHook {
  PreHandler = 'preHandler',
}

/** Instantiates every route class and registers them under /api behind the auth guard. */
export class RouteManager {
  private readonly routes: BaseRoute[]

  constructor(container: Container, private readonly guard: AuthGuard) {
    this.routes = [
      HealthRoute, ContentRoute, SearchRoute, StateRoute, SettingsRoute, PlacementRoute, WordActionRoute,
      ReviewRoute, SessionRoute, StatsRoute, SyncRoute, DataTransferRoute,
    ].map(Route => new Route(container))
  }

  registerAll(app: FastifyInstance): void {
    void app.register(
      async api => {
        api.addHook(ApiHook.PreHandler, this.guard.handle)
        this.routes.forEach(route => route.register(api))
      },
      { prefix: ApiPrefix.VALUE },
    )
  }
}
