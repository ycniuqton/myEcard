import type { AppConfig } from './config/AppConfig'
import { FileContentSource } from './content/FileContentSource'
import { SeedContentSource } from './content/SeedContentSource'
import { Database } from './db/Database'
import { SqliteProgressRepository } from './repositories/SqliteProgressRepository'
import type { ProgressRepository } from './repositories/ProgressRepository'
import { SchedulerManager } from '@wordmap/shared'
import { Clock } from './services/Clock'
import { ContentManager } from './services/ContentManager'
import { DataTransferManager } from './services/DataTransferManager'
import { DayStatManager } from './services/DayStatManager'
import { PlacementManager } from './services/PlacementManager'
import { ProgressManager } from './services/ProgressManager'
import { SessionManager } from './services/SessionManager'
import { SettingsManager } from './services/SettingsManager'
import { StatsManager } from './services/StatsManager'
import { SyncManager } from './services/SyncManager'

/** Wires the database, repository and every manager once per app instance. */
export class Container {
  readonly database: Database
  readonly repo: ProgressRepository
  readonly clock: Clock
  readonly content: ContentManager
  readonly settings: SettingsManager
  readonly days: DayStatManager
  readonly progress: ProgressManager
  readonly session: SessionManager
  readonly stats: StatsManager
  readonly sync: SyncManager
  readonly transfer: DataTransferManager
  readonly placement: PlacementManager

  constructor(readonly config: AppConfig, clock: Clock = new Clock()) {
    this.clock = clock
    this.database = new Database(config.dbPath)
    this.repo = new SqliteProgressRepository(this.database)
    this.content = new ContentManager([new FileContentSource(config.contentDir), new SeedContentSource(config.seedFile)])
    this.settings = new SettingsManager(this.repo, clock)
    this.days = new DayStatManager(this.repo, clock)
    this.progress = new ProgressManager(this.repo, this.content, new SchedulerManager(), this.settings, this.days, clock)
    this.session = new SessionManager(this.repo, this.content, this.settings, this.days)
    this.stats = new StatsManager(this.repo, this.content, clock)
    this.sync = new SyncManager(this.repo, this.settings, this.days, clock)
    this.transfer = new DataTransferManager(this.repo, this.settings, this.days, this.progress, clock)
    this.placement = new PlacementManager(this.repo, this.content, this.settings, this.progress, clock)
  }

  close(): void {
    this.database.close()
  }
}
