import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app'
import { AppConfig, ConfigDefaults } from '../../src/config/AppConfig'
import { Clock } from '../../src/services/Clock'

export class TestPaths {
  static readonly FIXTURES = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'fixtures')
  static readonly LARGE_FIXTURES = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'fixtures-large')
  static readonly MISSING_DIST = join(TestPaths.FIXTURES, 'no-web-dist')
}

export class TestTime {
  static readonly START = '2026-03-10T12:00:00.000Z'
  static readonly HOUR_MS = 3_600_000
}

/** Controllable clock for deterministic timestamps. */
export class TestClock extends Clock {
  constructor(private current: number = Date.parse(TestTime.START)) {
    super()
  }

  now(): Date {
    return new Date(this.current)
  }

  advanceHours(hours: number): void {
    this.current += hours * TestTime.HOUR_MS
  }
}

export class TestApp {
  static async create(
    clock: TestClock = new TestClock(),
    webDist = TestPaths.MISSING_DIST,
    contentDir = TestPaths.FIXTURES,
  ): Promise<FastifyInstance> {
    const config = AppConfig.fromEnv({}, { dbPath: ConfigDefaults.MEMORY_DB, contentDir, webDist, port: 0 })
    return createApp(config, clock)
  }

  static async json<T>(app: FastifyInstance, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown) {
    const res = await app.inject({ method, url, payload: payload as object | undefined })
    return { status: res.statusCode, body: res.json() as T, headers: res.headers }
  }
}

let counter = 0
export class Ids {
  static client(): string {
    counter += 1
    return `client-${counter}`
  }
}
