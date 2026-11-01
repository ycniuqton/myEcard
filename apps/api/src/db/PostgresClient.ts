import postgres, { type Sql } from 'postgres'
import { SqlClient, SqlExecutor, type SqlParam, type SqlResult, type SqlRow } from './SqlClient'

export class PostgresOptions {
  static readonly MAX_CONNECTIONS = 3
  static readonly IDLE_SECONDS = 20
  static readonly CLOSE_TIMEOUT_SECONDS = 5
}

type PostgresTarget = Pick<Sql, 'unsafe'>

/** Statement runner over a postgres.js pool or one of its transactions. */
export class PostgresExecutor extends SqlExecutor {
  constructor(private readonly target: PostgresTarget) {
    super()
  }

  async query<R extends SqlRow = SqlRow>(sql: string, params: SqlParam[] = []): Promise<SqlResult<R>> {
    const result = await this.target.unsafe(sql, params)
    return { rows: Array.from(result) as unknown as R[], rowCount: result.count ?? result.length }
  }

  async exec(script: string): Promise<void> {
    await this.target.unsafe(script)
  }
}

/** Real Postgres over DATABASE_URL; prepared statements are off so Supabase's transaction-mode pooler works. */
export class PostgresClient extends SqlClient {
  private readonly executor: PostgresExecutor
  private readonly sql: Sql

  constructor(url: string) {
    super()
    this.sql = postgres(url, {
      prepare: false, max: PostgresOptions.MAX_CONNECTIONS, idle_timeout: PostgresOptions.IDLE_SECONDS,
    })
    this.executor = new PostgresExecutor(this.sql)
  }

  query<R extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): Promise<SqlResult<R>> {
    return this.executor.query<R>(sql, params)
  }

  exec(script: string): Promise<void> {
    return this.executor.exec(script)
  }

  async transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return (await this.sql.begin(tx => work(new PostgresExecutor(tx)))) as T
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: PostgresOptions.CLOSE_TIMEOUT_SECONDS })
  }
}
