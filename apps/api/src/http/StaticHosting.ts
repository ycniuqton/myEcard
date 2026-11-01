import { existsSync } from 'node:fs'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'
import { ApiPrefix } from './RouteManager'
import type { ErrorHandler } from './ErrorHandler'

export class StaticFiles {
  static readonly INDEX = 'index.html'
  static readonly GET = 'GET'
  static readonly NOT_FOUND_MESSAGE = 'Route not found'
}

/** Serves the built web app with SPA fallback; unknown /api paths keep the JSON 404. */
export class StaticHosting {
  constructor(private readonly webDist: string, private readonly errors: ErrorHandler) {}

  register(app: FastifyInstance): void {
    const enabled = existsSync(this.webDist)
    if (enabled) void app.register(fastifyStatic, { root: this.webDist })
    app.setNotFoundHandler((req, reply) => {
      const isPage = req.method === StaticFiles.GET && !req.url.startsWith(ApiPrefix.VALUE)
      if (enabled && isPage) return reply.sendFile(StaticFiles.INDEX)
      const { status, body } = this.errors.notFound(StaticFiles.NOT_FOUND_MESSAGE)
      return reply.status(status).send(body)
    })
  }
}
