import type BetterSqlite3 from 'better-sqlite3'

/** Base class of a numbered, forward-only schema migration. */
export abstract class Migration {
  abstract readonly version: number
  abstract readonly name: string
  abstract up(db: BetterSqlite3.Database): void
}
