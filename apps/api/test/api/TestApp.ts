import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app'
import { AuthTestKit } from '../support/AuthTestKit'
import { AppConfig, AuthMode, ConfigDefaults, type AppConfigValues } from '../../src/config/AppConfig'
import { SharedTestDatabase } from '../support/SharedTestDatabase'
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
  static config(overrides: Partial<AppConfigValues> = {}): AppConfig {
    return AppConfig.fromEnv({}, {
      pgliteDir: ConfigDefaults.MEMORY_DB, contentDir: TestPaths.FIXTURES, webDist: TestPaths.MISSING_DIST, port: 0,
      ...overrides,
    })
  }

  static async create(
    clock: TestClock = new TestClock(),
    webDist = TestPaths.MISSING_DIST,
    contentDir = TestPaths.FIXTURES,
  ): Promise<FastifyInstance> {
    return createApp(TestApp.config({ contentDir, webDist }), { clock, sql: await SharedTestDatabase.acquire() })
  }

  static async createAuthenticated(kit: AuthTestKit, clock: TestClock = new TestClock()): Promise<FastifyInstance> {
    const config = TestApp.config({ authMode: AuthMode.Supabase, supabaseUrl: AuthTestKit.SUPABASE_URL })
    return createApp(config, { clock, auth: { keySet: kit.keySet }, sql: await SharedTestDatabase.acquire() })
  }

  static async json<T>(
    app: FastifyInstance, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown,
    headers: Record<string, string> = {},
  ) {
    const res = await app.inject({ method, url, payload: payload as object | undefined, headers })
    return { status: res.statusCode, body: res.json() as T, headers: res.headers }
  }
}

export class UserFixtures {
  static readonly ALICE = '11111111-1111-4111-8111-111111111111'
  static readonly BOB = '22222222-2222-4222-8222-222222222222'
}

let counter = 0
export class Ids {
  static client(): string {
    counter += 1
    return `client-${counter}`
  }
}
