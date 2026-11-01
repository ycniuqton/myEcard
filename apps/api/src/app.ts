import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { AppConfig } from './config/AppConfig'
import { Container } from './Container'
import type { SqlClient } from './db/SqlClient'
import { AuthGuard } from './http/auth/AuthGuard'
import type { SupabaseVerifierOptions } from './http/auth/SupabaseJwtVerifier'
import { ErrorHandler } from './http/ErrorHandler'
import { RouteManager } from './http/RouteManager'
import { StaticHosting } from './http/StaticHosting'
import type { Clock } from './services/Clock'

export class ServerLimits {
  static readonly BODY_BYTES = 32 * 1024 * 1024
}

export enum AppHook {
  OnClose = 'onClose',
}

export class CorsRules {
  static readonly METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  static readonly EXPOSED = ['ETag', 'Content-Disposition']
}

export type AppOptions = { clock?: Clock; auth?: SupabaseVerifierOptions; sql?: SqlClient }

/** Builds a fully wired Fastify instance (tests pass a clock and an injected JWKS key set). */
export async function createApp(config: AppConfig, options: AppOptions = {}): Promise<FastifyInstance> {
  const container = await Container.create(config, options.clock, options.sql)
  const app = Fastify({ bodyLimit: ServerLimits.BODY_BYTES })
  const errors = new ErrorHandler()
  app.setErrorHandler(errors.handle)
  app.decorateRequest('userId', '')
  await app.register(cors, {
    origin: config.corsOrigin, methods: CorsRules.METHODS, exposedHeaders: CorsRules.EXPOSED,
  })
  new RouteManager(container, new AuthGuard(config, options.auth)).registerAll(app)
  new StaticHosting(config.webDist, errors).register(app)
  app.addHook(AppHook.OnClose, async () => container.close())
  await app.ready()
  return app
}
