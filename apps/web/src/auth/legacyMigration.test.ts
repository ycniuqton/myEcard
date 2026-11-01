import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { ApiClient, OfflineStore, SyncEngine } from '../api'
import { FakeEnv, FakeServer, TestKit } from '../api/testKit'
import { createAppStore } from '../store'
import { AuthConfig } from './AuthConfig'
import { LegacyMigration } from './LegacyMigration'

const USER = 'user-legacy'

function memory() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) }
}

async function seedLegacy(): Promise<void> {
  const legacy = new OfflineStore(AuthConfig.LEGACY_DB)
  await legacy.putUserWords([TestKit.row('w1', '2026-06-01T00:00:00.000Z'), TestKit.row('w2', '2026-06-02T00:00:00.000Z')])
  await legacy.saveSettings(TestKit.settings({ placementDone: true }))
  legacy.close()
}

describe('LegacyMigration', () => {
  it('offers nothing when the legacy database does not exist', async () => {
    const migration = new LegacyMigration({ storage: memory() })
    expect(await migration.shouldOffer(USER, false)).toBe(false)
  })

  it('offers once when legacy has progress and the account has none, and never uploads by itself', async () => {
    await seedLegacy()
    const storage = memory()
    const migration = new LegacyMigration({ storage })
    expect(await migration.shouldOffer(USER, true)).toBe(false)
    expect(await migration.shouldOffer(USER, false)).toBe(true)
    migration.dismiss(USER)
    expect(await migration.shouldOffer(USER, false)).toBe(false)
    expect(storage.getItem(`wordmap.legacyPrompt.${USER}`)).toBe('done')
    expect(await new LegacyMigration({ storage: memory() }).shouldOffer('someone-else', false)).toBe(true)
  })

  it('uploads through the existing import path on accept, then settles', async () => {
    await seedLegacy()
    const server = new FakeServer()
    const offline = new OfflineStore(`wordmap-${USER}`)
    const api = new ApiClient({ baseUrl: '/api', fetchImpl: server.fetch })
    const clock = () => TestKit.NOW
    const engine = new SyncEngine({ store: offline, api, env: new FakeEnv(), clock })
    const store = createAppStore({ api, offline, engine, clock })
    const migration = new LegacyMigration({ storage: memory() })

    expect(server.imports).toHaveLength(0)
    await migration.upload(USER, snapshot => store.getState().importData(snapshot))
    expect(server.imports).toHaveLength(1)
    expect([...server.userWords.keys()].sort()).toEqual(['w1', 'w2'])
    expect([...store.getState().userWords.keys()].sort()).toEqual(['w1', 'w2'])
    expect(migration.isSettled(USER)).toBe(true)
    expect(await migration.shouldOffer(USER, false)).toBe(false)
  })

  it('does not settle when the upload fails', async () => {
    await seedLegacy()
    const migration = new LegacyMigration({ storage: memory() })
    await expect(migration.upload(USER, async () => Promise.reject(new Error('offline')))).rejects.toThrow('offline')
    expect(migration.isSettled(USER)).toBe(false)
  })
})
