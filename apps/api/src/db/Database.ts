import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { ConfigDefaults } from '../config/AppConfig'
import { MigrationRegistry } from './migrations'
import { Migrator } from './Migrator'

export enum SqlPragma {
  Wal = 'journal_mode = WAL',
  ForeignKeys = 'foreign_keys = ON',
}

/** Opens the SQLite file (WAL, foreign keys) and brings the schema up to date. */
export class Database {
  readonly raw: BetterSqlite3.Database

  constructor(path: string) {
    if (path !== ConfigDefaults.MEMORY_DB) mkdirSync(dirname(path), { recursive: true })
    this.raw = new BetterSqlite3(path)
    this.raw.pragma(SqlPragma.Wal)
    this.raw.pragma(SqlPragma.ForeignKeys)
    new Migrator(this.raw, MigrationRegistry.all()).run()
  }

  close(): void {
    this.raw.close()
  }
}
