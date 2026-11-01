import type { AppConfig } from '../config/AppConfig'
import { MigrationFiles } from './MigrationFiles'
import { Migrator } from './Migrator'
import { PgliteClient } from './PgliteClient'
import { SqlClientFactory } from './SqlClientFactory'
import type { SqlClient } from './SqlClient'

/** Opens the configured database; embedded PGlite gets its auth stub and is migrated on open. */
export class DatabaseBootstrap {
  static async open(config: AppConfig): Promise<SqlClient> {
    const client = await SqlClientFactory.create(config)
    if (client instanceof PgliteClient) await DatabaseBootstrap.prepareEmbedded(client)
    return client
  }

  static async prepareEmbedded(client: SqlClient): Promise<void> {
    const files = new MigrationFiles()
    await client.exec(files.authStub())
    await new Migrator(client, files).run()
  }
}
