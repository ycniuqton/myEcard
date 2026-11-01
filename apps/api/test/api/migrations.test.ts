import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MigrationFiles } from '../../src/db/MigrationFiles'
import { Migrator } from '../../src/db/Migrator'
import { PgliteClient } from '../../src/db/PgliteClient'
import { UserFixtures } from './TestApp'

const LATEST = 4
const TABLES = ['settings', 'user_words', 'review_logs', 'day_stats']

let db: PgliteClient

beforeEach(async () => {
  db = await PgliteClient.open()
  await db.exec(new MigrationFiles().authStub())
})
afterEach(async () => {
  await db.close()
})

describe('sql migrations', () => {
  it('apply in order, are tracked in schema_migrations and are idempotent', async () => {
    expect(await new Migrator(db).run()).toBe(LATEST)
    expect(await new Migrator(db).run()).toBe(LATEST)
    const rows = await db.query<{ version: number; name: string }>('SELECT version, name FROM schema_migrations ORDER BY version')
    expect(rows.rows.map(r => r.version)).toEqual([1, 2, 3, 4])
    expect(rows.rows[0].name).toBe('initial_schema')
  })

  it('give every table a user_id uuid column and enable row level security', async () => {
    await new Migrator(db).run()
    const cols = await db.query<{ table_name: string; data_type: string }>(
      "SELECT table_name, data_type FROM information_schema.columns WHERE column_name = 'user_id' AND table_schema = 'public'",
    )
    expect(cols.rows.map(r => r.table_name).sort()).toEqual([...TABLES].sort())
    expect(new Set(cols.rows.map(r => r.data_type))).toEqual(new Set(['uuid']))
    const rls = await db.query<{ relname: string }>(
      "SELECT relname FROM pg_class WHERE relrowsecurity AND relname IN ('settings', 'user_words', 'review_logs', 'day_stats')",
    )
    expect(rls.rows).toHaveLength(TABLES.length)
  })

  it('reject non-uuid user ids', async () => {
    await new Migrator(db).run()
    await expect(db.query("INSERT INTO day_stats VALUES ('me', '2026-01-01', 0, 0, false, 'x')")).rejects.toThrow()
    await db.query("INSERT INTO day_stats VALUES ($1, '2026-01-01', 0, 0, false, 'x')", [UserFixtures.ALICE])
  })
})
