import type { SqlClient, SqlExecutor } from './SqlClient'
import { MigrationFiles, type SqlMigration } from './MigrationFiles'

/** Statements of the schema_migrations bookkeeping table. */
export class MigrationQueries {
  static readonly CREATE = `CREATE TABLE IF NOT EXISTS schema_migrations (
    version integer PRIMARY KEY, name text NOT NULL, applied_at text NOT NULL)`
  static readonly MAX_VERSION = 'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations'
  static readonly RECORD = 'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)'
}

/** Applies pending SQL migrations in version order, each in its own transaction. Works on any SqlClient. */
export class Migrator {
  constructor(
    private readonly db: SqlClient,
    private readonly files: MigrationFiles = new MigrationFiles(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async run(): Promise<number> {
    await this.db.exec(MigrationQueries.CREATE)
    const current = await this.currentVersion()
    const pending = this.files.load().filter(m => m.version > current)
    for (const migration of pending) await this.apply(migration)
    return this.currentVersion()
  }

  async currentVersion(): Promise<number> {
    const result = await this.db.query<{ version: number | string }>(MigrationQueries.MAX_VERSION)
    return Number(result.rows[0].version)
  }

  private apply(migration: SqlMigration): Promise<void> {
    return this.db.transaction(async (tx: SqlExecutor) => {
      await tx.exec(migration.sql)
      await tx.query(MigrationQueries.RECORD, [migration.version, migration.name, this.now()])
    })
  }
}
