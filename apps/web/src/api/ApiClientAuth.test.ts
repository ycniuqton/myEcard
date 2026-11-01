import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Grade } from '@wordmap/shared'
import { ApiError } from './ApiError'
import type { AuthTokenProvider } from './AuthTokenProvider'
import { FakeEnv, FakeServer, TestKit } from './testKit'

class StubAuth implements AuthTokenProvider {
  token: string | null = 'good'
  refreshed = 0
  expired = 0
  nextToken: string | null = 'good'

  accessToken = async () => this.token
  onUnauthenticated = () => {
    this.expired++
  }

  refresh = async () => {
    this.refreshed++
    this.token = this.nextToken
    return this.nextToken !== null
  }
}

function setup(accepted = 'good') {
  const server = new FakeServer()
  server.accept = token => token === accepted
  const auth = new StubAuth()
  return { server, auth, api: server.client(auth) }
}

describe('ApiClient bearer token', () => {
  it('sends Authorization on protected calls but not on health or content', async () => {
    const { server, api } = setup()
    await api.health()
    await api.words()
    await api.state()
    expect(server.tokens).toEqual([null, null, 'good'])
  })

  it('on 401 refreshes once, retries once and succeeds with the new token', async () => {
    const { server, auth, api } = setup('renewed')
    auth.token = 'stale'
    auth.nextToken = 'renewed'
    const state = await api.state()
    expect(state.userWords).toEqual([])
    expect(auth.refreshed).toBe(1)
    expect(auth.expired).toBe(0)
    expect(server.tokens).toEqual(['stale', 'renewed'])
  })

  it('still 401 after the retry signs out and throws an unauthenticated ApiError', async () => {
    const { server, auth, api } = setup('never')
    const error = await api.state().catch(e => e as ApiError)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isUnauthenticated).toBe(true)
    expect((error as ApiError).code).toBe('UNAUTHENTICATED')
    expect(auth.refreshed).toBe(1)
    expect(auth.expired).toBe(1)
    expect(server.tokens).toHaveLength(2)
  })

  it('failed refresh signs out without a second request', async () => {
    const { server, auth, api } = setup('never')
    auth.nextToken = null
    await api.state().catch(() => undefined)
    expect(server.tokens).toHaveLength(1)
    expect(auth.expired).toBe(1)
  })

  it('without a token provider a 401 is just an error (auth mode none)', async () => {
    const server = new FakeServer()
    server.accept = () => false
    const error = await server.client().state().catch(e => e as ApiError)
    expect((error as ApiError).status).toBe(401)
  })
})

describe('SyncEngine on 401', () => {
  it('keeps the outbox, schedules no retry and flushes after re-login', async () => {
    const { server, auth } = setup('never')
    const env = new FakeEnv()
    const store = TestKit.freshStore()
    await store.saveSettings(TestKit.settings())
    const engine = server.engine(store, env, undefined, auth)
    await engine.recordReview({ wordId: 'w1', grade: Grade.Good })
    for (let i = 0; i < 5; i++) await engine.flush()
    expect(await store.pendingCount()).toBeGreaterThan(0)
    expect(env.delays).toHaveLength(0)
    expect(engine.status().lastError).toBeTruthy()

    server.accept = token => token === 'good'
    auth.token = 'good'
    await engine.flush()
    expect(await store.pendingCount()).toBe(0)
    expect(server.userWords.has('w1')).toBe(true)
  })
})
