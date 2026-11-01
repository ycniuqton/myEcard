import { AppConfig } from '../config/AppConfig'
import { Migrator } from './Migrator'
import { PostgresClient } from './PostgresClient'

export class MigrateMessages {
  static readonly MISSING_URL = 'DATABASE_URL is required to run migrations'
  static readonly DONE = 'Schema is at version'
}

/** CLI entry: applies pending SQL migrations to DATABASE_URL. */
async function main(): Promise<void> {
  const config = AppConfig.fromEnv()
  if (!config.databaseUrl) throw new Error(MigrateMessages.MISSING_URL)
  const client = new PostgresClient(config.databaseUrl)
  try {
    const version = await new Migrator(client).run()
    console.log(`${MigrateMessages.DONE} ${version}`)
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
