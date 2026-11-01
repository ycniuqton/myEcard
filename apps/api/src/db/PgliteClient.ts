import { mkdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { SqlClient, SqlExecutor, type SqlParam, type SqlResult, type SqlRow } from './SqlClient'

type PgliteTarget = Pick<PGlite, 'query' | 'exec'>

/** Statement runner over a PGlite instance or one of its transactions. */
export class PgliteExecutor extends SqlExecutor {
  constructor(private readonly target: PgliteTarget) {
    super()
  }

  async query<R extends SqlRow = SqlRow>(sql: string, params: SqlParam[] = []): Promise<SqlResult<R>> {
    const result = await this.target.query<R>(sql, params)
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length }
  }

  async exec(script: string): Promise<void> {
    await this.target.exec(script)
  }
}

/** Embedded Postgres (PGlite), in memory when no directory is given; used for tests and local development. */
export class PgliteClient extends SqlClient {
  private readonly executor: PgliteExecutor

  private constructor(private readonly db: PGlite) {
    super()
    this.executor = new PgliteExecutor(db)
  }

  static async open(dataDir?: string): Promise<PgliteClient> {
    if (dataDir) mkdirSync(dataDir, { recursive: true })
    return new PgliteClient(await PGlite.create(dataDir))
  }

  query<R extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): Promise<SqlResult<R>> {
    return this.executor.query<R>(sql, params)
  }

  exec(script: string): Promise<void> {
    return this.executor.exec(script)
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(tx => work(new PgliteExecutor(tx)))
  }

  async close(): Promise<void> {
    await this.db.close()
  }
}
