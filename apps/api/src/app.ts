import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { AppConfig } from './config/AppConfig'
import { Container } from './Container'
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

/** Builds a fully wired Fastify instance (also used by tests with an in-memory database). */
export async function createApp(config: AppConfig, clock?: Clock): Promise<FastifyInstance> {
  const container = new Container(config, clock)
  const app = Fastify({ bodyLimit: ServerLimits.BODY_BYTES })
  const errors = new ErrorHandler()
  app.setErrorHandler(errors.handle)
  await app.register(cors, {
    origin: config.corsOrigin, methods: CorsRules.METHODS, exposedHeaders: CorsRules.EXPOSED,
  })
  new RouteManager(container).registerAll(app)
  new StaticHosting(config.webDist, errors).register(app)
  app.addHook(AppHook.OnClose, async () => container.close())
  await app.ready()
  return app
}
