import type BetterSqlite3 from 'better-sqlite3'
import type { Migration } from './Migration'

export enum MetaKey {
  SchemaVersion = 'schema_version',
}

/** Statements that maintain the schema-version bookkeeping table. */
export class MetaQueries {
  static readonly CREATE = 'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
  static readonly SELECT_VALUE = 'SELECT value FROM meta WHERE key = ?'
  static readonly UPSERT_VALUE =
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
}

/** Applies pending migrations in version order, each in its own transaction. */
export class Migrator {
  constructor(private readonly db: BetterSqlite3.Database, private readonly migrations: Migration[]) {}

  run(): number {
    this.db.exec(MetaQueries.CREATE)
    const current = this.currentVersion()
    const pending = this.migrations.filter(m => m.version > current).sort((a, b) => a.version - b.version)
    for (const migration of pending) this.apply(migration)
    return this.currentVersion()
  }

  currentVersion(): number {
    const row = this.db.prepare(MetaQueries.SELECT_VALUE).get(MetaKey.SchemaVersion) as
      | { value: string }
      | undefined
    return row ? Number(row.value) : 0
  }

  private apply(migration: Migration): void {
    const step = this.db.transaction(() => {
      migration.up(this.db)
      this.db.prepare(MetaQueries.UPSERT_VALUE).run(MetaKey.SchemaVersion, String(migration.version))
    })
    step()
  }
}
