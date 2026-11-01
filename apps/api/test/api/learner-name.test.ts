import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SettingsLimits, type ExportSnapshot, type Settings, type StateResponse, type SyncResponse } from '@wordmap/shared'
import { MigrationFiles } from '../../src/db/MigrationFiles'
import { Migrator } from '../../src/db/Migrator'
import { PgliteClient } from '../../src/db/PgliteClient'
import { TestApp, UserFixtures } from './TestApp'

const EPOCH = '1970-01-01T00:00:00.000Z'
const SETTINGS_PATH = '/api/settings'
const STATE_PATH = '/api/state'
const OLD_SCHEMA_VERSION = 2
const V003_VERSION = 3
const NAME = 'Linh'

let app: FastifyInstance
const api = <T>(m: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) => TestApp.json<T>(app, m, url, body)
const state = async () => (await api<StateResponse>('GET', STATE_PATH)).body

beforeEach(async () => {
  app = await TestApp.create()
})
afterEach(async () => {
  await app.close()
})

describe('learnerName setting', () => {
  it('is absent by default and saved trimmed through PUT /settings', async () => {
    expect((await state()).settings.learnerName).toBeUndefined()
    const set = await api<Settings>('PUT', SETTINGS_PATH, { learnerName: `  ${NAME}  ` })
    expect(set.body.learnerName).toBe(NAME)
    expect((await state()).settings.learnerName).toBe(NAME)
  })

  it('allows empty (clears the name) and rejects names over the limit', async () => {
    await api('PUT', SETTINGS_PATH, { learnerName: NAME })
    const cleared = await api<Settings>('PUT', SETTINGS_PATH, { learnerName: '   ' })
    expect(cleared.status).toBe(200)
    expect(cleared.body.learnerName).toBeUndefined()
    const max = 'a'.repeat(SettingsLimits.LEARNER_NAME_MAX)
    expect((await api<Settings>('PUT', SETTINGS_PATH, { learnerName: max })).body.learnerName).toBe(max)
    expect((await api('PUT', SETTINGS_PATH, { learnerName: `${max}a` })).status).toBe(400)
  })

  it('keeps the name when other settings change', async () => {
    await api('PUT', SETTINGS_PATH, { learnerName: NAME })
    const res = await api<Settings>('PUT', SETTINGS_PATH, { dailyNew: 9 })
    expect(res.body).toMatchObject({ dailyNew: 9, learnerName: NAME })
  })

  it('round-trips through export and import, and old exports without the field still import', async () => {
    await api('PUT', SETTINGS_PATH, { learnerName: NAME })
    const exported = await api<ExportSnapshot>('GET', '/api/export')
    expect(exported.body.settings.learnerName).toBe(NAME)
    await api('PUT', SETTINGS_PATH, { learnerName: 'Other' })
    await api('POST', '/api/import', exported.body)
    expect((await state()).settings.learnerName).toBe(NAME)
    const legacy: Partial<Settings> = { ...exported.body.settings }
    delete legacy.learnerName
    const old = await api<StateResponse>('POST', '/api/import', { ...exported.body, settings: legacy })
    expect(old.status).toBe(200)
    expect(old.body.settings.learnerName).toBeUndefined()
  })

  it('travels in sync payloads in both directions', async () => {
    const settings: Settings = { ...(await state()).settings, learnerName: NAME }
    const stamp = new Date().toISOString()
    const changes = { userWords: [], reviewLogs: [], dayStats: [] }
    const pushed = await api<SyncResponse>('POST', '/api/sync', {
      since: EPOCH, changes: { ...changes, settings, settingsUpdatedAt: stamp },
    })
    expect(pushed.status).toBe(200)
    expect((await state()).settings.learnerName).toBe(NAME)
    const pulled = await api<SyncResponse>('POST', '/api/sync', { since: EPOCH, changes })
    expect(pulled.body.serverChanges.settings?.learnerName).toBe(NAME)
  })
})

class UpToVersion extends MigrationFiles {
  constructor(private readonly max: number) {
    super()
  }

  load() {
    return super.load().filter(m => m.version <= this.max)
  }
}

describe('migration V003', () => {
  it('adds learner_name to an existing v2 database and keeps current settings', async () => {
    const db = await PgliteClient.open()
    await db.exec(new MigrationFiles().authStub())
    await new Migrator(db, new UpToVersion(OLD_SCHEMA_VERSION)).run()
    await db.query(
      "INSERT INTO settings (user_id, daily_new, theme, voice, active_list_id, placement_done, updated_at, synced_at) VALUES ($1, 7, 'dark', 'us', 'ngsl', true, 'a', 'b')",
      [UserFixtures.ALICE],
    )
    expect(await new Migrator(db).run()).toBeGreaterThanOrEqual(V003_VERSION)
    const row = await db.query('SELECT daily_new, learner_name FROM settings WHERE user_id = $1', [UserFixtures.ALICE])
    expect(row.rows).toEqual([{ daily_new: 7, learner_name: '' }])
    await db.close()
  })
})
