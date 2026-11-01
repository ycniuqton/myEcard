import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { createApp } from '../src/app'
import { AppConfig, EnvKey } from '../src/config/AppConfig'

export class ServerlessPaths {
  static readonly CONTENT_DIR = fileURLToPath(new URL('../content', import.meta.url))
  static readonly REQUEST_EVENT = 'request'
}

let booted: Promise<FastifyInstance> | undefined

function boot(): Promise<FastifyInstance> {
  const contentDir = process.env[EnvKey.ContentDir] ?? ServerlessPaths.CONTENT_DIR
  return createApp(AppConfig.fromEnv(process.env, { contentDir }))
}

/** Vercel function entry: boots the Fastify app once per instance and forwards each request to it. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  booted ??= boot()
  const app = await booted
  app.server.emit(ServerlessPaths.REQUEST_EVENT, req, res)
}
