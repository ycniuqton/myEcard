import type { AppConfig } from '../config/AppConfig'
import { ConfigDefaults } from '../config/AppConfig'
import { PgliteClient } from './PgliteClient'
import { PostgresClient } from './PostgresClient'
import type { SqlClient } from './SqlClient'

/** Chooses the database implementation from configuration: DATABASE_URL, else PGlite (disk or memory). */
export class SqlClientFactory {
  static async create(config: AppConfig): Promise<SqlClient> {
    if (config.databaseUrl) return new PostgresClient(config.databaseUrl)
    const inMemory = config.pgliteDir === ConfigDefaults.MEMORY_DB
    return PgliteClient.open(inMemory ? undefined : config.pgliteDir)
  }
}
