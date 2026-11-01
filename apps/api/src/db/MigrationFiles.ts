import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type SqlMigration = { version: number; name: string; sql: string }

export class MigrationLocation {
  static readonly DIR = fileURLToPath(new URL('./migrations/', import.meta.url))
  static readonly PGLITE_AUTH_STUB = fileURLToPath(new URL('./bootstrap/pglite-auth-stub.sql', import.meta.url))
  static readonly FILE_PATTERN = /^V(\d+)_(.+)\.sql$/
  static readonly ENCODING = 'utf8'
}

/** Loads the plain .sql migration files, ordered by version. */
export class MigrationFiles {
  constructor(private readonly dir: string = MigrationLocation.DIR) {}

  load(): SqlMigration[] {
    return readdirSync(this.dir)
      .map(file => this.parse(file))
      .filter((m): m is SqlMigration => m !== null)
      .sort((a, b) => a.version - b.version)
  }

  authStub(): string {
    return readFileSync(MigrationLocation.PGLITE_AUTH_STUB, MigrationLocation.ENCODING)
  }

  private parse(file: string): SqlMigration | null {
    const match = MigrationLocation.FILE_PATTERN.exec(file)
    if (!match) return null
    const sql = readFileSync(join(this.dir, file), MigrationLocation.ENCODING)
    return { version: Number(match[1]), name: match[2], sql }
  }
}
