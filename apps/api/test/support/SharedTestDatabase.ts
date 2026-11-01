import { DatabaseBootstrap } from '../../src/db/DatabaseBootstrap'
import { PgliteClient } from '../../src/db/PgliteClient'
import { SqlClient, type SqlExecutor, type SqlParam, type SqlResult, type SqlRow } from '../../src/db/SqlClient'

export class TestTables {
  static readonly ALL = ['settings', 'user_words', 'review_logs', 'day_stats']
}

/** One migrated in-memory PGlite per test file, emptied on every acquire; close() leaves it open. */
export class SharedTestDatabase extends SqlClient {
  private static instance: Promise<PgliteClient> | undefined

  private constructor(private readonly inner: PgliteClient) {
    super()
  }

  static async acquire(): Promise<SharedTestDatabase> {
    SharedTestDatabase.instance ??= PgliteClient.open().then(async db => {
      await DatabaseBootstrap.prepareEmbedded(db)
      return db
    })
    const db = await SharedTestDatabase.instance
    await db.exec(`TRUNCATE ${TestTables.ALL.join(', ')}`)
    return new SharedTestDatabase(db)
  }

  query<R extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): Promise<SqlResult<R>> {
    return this.inner.query<R>(sql, params)
  }

  exec(script: string): Promise<void> {
    return this.inner.exec(script)
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.inner.transaction(work)
  }

  async close(): Promise<void> {}
}
