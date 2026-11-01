import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { ApiClient, OfflineStore, SyncEngine } from '../api'
import type { AuthTokenProvider } from '../api/AuthTokenProvider'
import { FakeEnv, FakeServer, TestKit } from '../api/testKit'
import { createAppStore } from './index'

const U1 = 'wordmap-iso-u1'
const U2 = 'wordmap-iso-u2'

function harness() {
  const servers = new Map<string, FakeServer>([[U1, new FakeServer()], [U2, new FakeServer()]])
  let current = U1
  const auth: AuthTokenProvider = {
    accessToken: async () => `tok-${current}`,
    refresh: async () => false,
    onUnauthenticated: () => undefined,
  }
  const fetchImpl: typeof fetch = (input, init) => (servers.get(current) as FakeServer).fetch(input, init)
  const api = new ApiClient({ baseUrl: '/api', fetchImpl, auth })
  const offline = new OfflineStore(null)
  const clock = () => TestKit.NOW
  const engine = new SyncEngine({ store: offline, api, env: new FakeEnv(), clock })
  const store = createAppStore({ api, offline, engine, clock })
  const as = async (name: string) => {
    await store.getState().unbindDatabase(false)
    current = name
    await store.getState().bindDatabase(name)
  }
  return { store, servers, as, engine, offline }
}

describe('per-user store isolation', () => {
  it('never shows or pushes one account data under another and restores it on return', async () => {
    const h = harness()
    await h.as(U1)
    await h.store.getState().markKnown('w1')
    await h.engine.flush()
    expect(h.servers.get(U1)?.userWords.has('w1')).toBe(true)

    await h.store.getState().unbindDatabase(false)
    expect(h.store.getState().userWords.size).toBe(0)
    expect(h.store.getState().ready).toBe(false)

    await h.as(U2)
    expect(h.store.getState().userWords.size).toBe(0)
    await h.store.getState().markKnown('w2')
    await h.engine.flush()
    expect([...h.store.getState().userWords.keys()]).toEqual(['w2'])
    expect(h.servers.get(U2)?.userWords.has('w1')).toBe(false)
    expect(h.servers.get(U1)?.userWords.has('w2')).toBe(false)

    await h.as(U1)
    expect([...h.store.getState().userWords.keys()]).toEqual(['w1'])
  })

  it('keeps unsynced mutations with their owner and never sends them for another account', async () => {
    const h = harness()
    await h.as(U1)
    const first = h.servers.get(U1) as FakeServer
    await h.engine.flush()
    first.down = true
    await h.store.getState().markKnown('w3')
    expect(h.engine.status().pending).toBeGreaterThan(0)

    await h.as(U2)
    await h.engine.flush()
    expect(h.engine.status().pending).toBe(0)
    expect((h.servers.get(U2) as FakeServer).userWords.has('w3')).toBe(false)
    expect(h.store.getState().userWords.has('w3')).toBe(false)

    first.down = false
    await h.as(U1)
    expect(h.store.getState().userWords.has('w3')).toBe(true)
    await h.engine.flush()
    expect(first.userWords.has('w3')).toBe(true)
  })

  it('wiping on log out deletes the user cache from the device', async () => {
    const h = harness()
    await h.as(U2)
    await h.store.getState().markKnown('w4')
    await h.store.getState().unbindDatabase(true)
    const names = (await indexedDB.databases()).map(d => d.name)
    expect(names).not.toContain(U2)
    expect(h.offline.name).toBeNull()
    expect(h.store.getState().userWords.size).toBe(0)

    ;(h.servers.get(U2) as FakeServer).down = true
    await h.as(U2)
    expect(h.store.getState().userWords.size).toBe(0)
  })

  it('refuses to read before a database is bound', async () => {
    const offline = new OfflineStore(null)
    await expect(offline.loadWords()).rejects.toThrow(OfflineStore.UNBOUND)
  })
})
