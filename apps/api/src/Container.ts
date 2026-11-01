import type { AppConfig } from './config/AppConfig'
import { FileContentSource } from './content/FileContentSource'
import { SeedContentSource } from './content/SeedContentSource'
import { DatabaseBootstrap } from './db/DatabaseBootstrap'
import type { SqlClient } from './db/SqlClient'
import { Clock } from './services/Clock'
import { ContentManager } from './services/ContentManager'
import { UserScope } from './UserScope'

/** Process-wide wiring: config, clock, content and the SQL client; hands out cheap per-user scopes. */
export class Container {
  private constructor(
    readonly config: AppConfig,
    readonly clock: Clock,
    readonly content: ContentManager,
    readonly sql: SqlClient,
  ) {}

  static async create(config: AppConfig, clock: Clock = new Clock(), sql?: SqlClient): Promise<Container> {
    const content = new ContentManager([new FileContentSource(config.contentDir), new SeedContentSource(config.seedFile)])
    return new Container(config, clock, content, sql ?? (await DatabaseBootstrap.open(config)))
  }

  forUser(userId: string): UserScope {
    return new UserScope(this.sql, userId, this.content, this.clock)
  }

  close(): Promise<void> {
    return this.sql.close()
  }
}
