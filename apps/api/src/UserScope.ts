import { SchedulerManager } from '@wordmap/shared'
import type { SqlClient } from './db/SqlClient'
import { PgProgressRepository } from './repositories/PgProgressRepository'
import type { ProgressRepository } from './repositories/ProgressRepository'
import type { Clock } from './services/Clock'
import type { ContentManager } from './services/ContentManager'
import { DataTransferManager } from './services/DataTransferManager'
import { DayStatManager } from './services/DayStatManager'
import { PlacementManager } from './services/PlacementManager'
import { ProgressManager } from './services/ProgressManager'
import { SearchManager } from './services/SearchManager'
import { SessionManager } from './services/SessionManager'
import { SettingsManager } from './services/SettingsManager'
import { StatsManager } from './services/StatsManager'
import { SyncManager } from './services/SyncManager'

/** Every manager wired over one user's repository; built per request, holds no connections of its own. */
export class UserScope {
  readonly repo: ProgressRepository
  readonly settings: SettingsManager
  readonly days: DayStatManager
  readonly progress: ProgressManager
  readonly session: SessionManager
  readonly stats: StatsManager
  readonly sync: SyncManager
  readonly transfer: DataTransferManager
  readonly placement: PlacementManager
  readonly search: SearchManager

  constructor(sql: SqlClient, readonly userId: string, content: ContentManager, clock: Clock) {
    this.repo = new PgProgressRepository(sql, userId)
    this.settings = new SettingsManager(this.repo, clock)
    this.days = new DayStatManager(this.repo, clock)
    this.progress = new ProgressManager(this.repo, content, new SchedulerManager(), this.settings, this.days, clock)
    this.session = new SessionManager(this.repo, content, this.settings, this.days)
    this.stats = new StatsManager(this.repo, content, clock)
    this.sync = new SyncManager(this.repo, this.settings, this.days, clock)
    this.transfer = new DataTransferManager(this.repo, this.settings, this.days, this.progress, clock)
    this.placement = new PlacementManager(this.repo, content, this.settings, this.progress, clock)
    this.search = new SearchManager(this.repo, content)
  }
}
