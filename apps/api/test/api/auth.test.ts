import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ApiErrorBody, StateResponse } from '@wordmap/shared'
import { AuthMode, ConfigDefaults } from '../../src/config/AppConfig'
import { AuthTestKit, KitDefaults } from '../support/AuthTestKit'
import { TestApp, UserFixtures } from './TestApp'

const STATE = '/api/state'
const UNAUTHENTICATED = 'UNAUTHENTICATED'
const GARBAGE = 'Bearer not.a.jwt'

let app: FastifyInstance
let kit: AuthTestKit
const get = (url: string, headers: Record<string, string> = {}) => TestApp.json<ApiErrorBody>(app, 'GET', url, undefined, headers)

beforeAll(async () => {
  kit = await AuthTestKit.create()
  app = await TestApp.createAuthenticated(kit)
})
afterAll(async () => {
  await app.close()
})

describe('AuthGuard in supabase mode', () => {
  it('rejects a missing token with 401 and the uniform error body', async () => {
    const res = await get(STATE)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe(UNAUTHENTICATED)
    expect(typeof res.body.error.message).toBe('string')
  })

  it('rejects garbage, expired, wrong-audience, wrong-issuer and foreign-key tokens', async () => {
    const alice = UserFixtures.ALICE
    const foreign = await AuthTestKit.foreignKey()
    const bad = [
      { authorization: GARBAGE },
      { authorization: 'Basic abc' },
      await kit.bearer(alice, { expiresIn: KitDefaults.EXPIRED }),
      await kit.bearer(alice, { audience: 'anon' }),
      await kit.bearer(alice, { issuer: 'https://evil.example/auth/v1' }),
      await kit.bearer(alice, { key: foreign }),
      await kit.bearer('not-a-uuid'),
    ]
    for (const headers of bad) {
      const res = await get(STATE, headers)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe(UNAUTHENTICATED)
    }
  })

  it('accepts a valid token and scopes the request to its sub', async () => {
    const res = await TestApp.json<StateResponse>(app, 'GET', STATE, undefined, await kit.bearer(UserFixtures.ALICE))
    expect(res.status).toBe(200)
    expect(res.body.userWords).toEqual([])
  })

  it('keeps health, content words and credits open without a token', async () => {
    for (const url of ['/api/health', '/api/content/words', '/api/content/credits']) {
      expect((await get(url)).status).toBe(200)
    }
  })

  it('protects every other api route including writes', async () => {
    const res = await TestApp.json<ApiErrorBody>(app, 'DELETE', '/api/progress')
    expect(res.status).toBe(401)
    const sync = await TestApp.json<ApiErrorBody>(app, 'POST', '/api/sync', {})
    expect(sync.status).toBe(401)
  })

  it('leaves unknown api paths as 404', async () => {
    expect((await get('/api/nope')).status).toBe(404)
  })
})

describe('AUTH_MODE=none', () => {
  it('acts as the fixed dev user without any token', async () => {
    const dev = await TestApp.create()
    const res = await TestApp.json<StateResponse>(dev, 'GET', STATE)
    expect(res.status).toBe(200)
    expect(AuthMode.None).toBe('none')
    expect(ConfigDefaults.DEV_USER_ID).toMatch(/^[0-9a-f-]{36}$/)
    await dev.close()
  })
})
