export type SqlParam = string | number | boolean | null
export type SqlRow = Record<string, unknown>
export type SqlResult<R extends SqlRow> = { rows: R[]; rowCount: number }

/** Runs statements against one connection scope (a pool, or a single open transaction). */
export abstract class SqlExecutor {
  abstract query<R extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): Promise<SqlResult<R>>
  abstract exec(script: string): Promise<void>
}

/** Database access contract: statements, transactions and shutdown; implementations are chosen by configuration. */
export abstract class SqlClient extends SqlExecutor {
  abstract transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>
  abstract close(): Promise<void>
}
