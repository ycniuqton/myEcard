import type { ExportSnapshot, ImportRequest, StateResponse } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'
import type { DayStatManager } from './DayStatManager'
import type { ProgressManager } from './ProgressManager'
import type { SettingsManager } from './SettingsManager'

export class SnapshotFormat {
  static readonly VERSION = 1
}

/** Exports, imports and resets the whole progress snapshot. */
export class DataTransferManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly settings: SettingsManager,
    private readonly days: DayStatManager,
    private readonly progress: ProgressManager,
    private readonly clock: Clock,
  ) {}

  export(): ExportSnapshot {
    return {
      version: SnapshotFormat.VERSION,
      exportedAt: this.clock.iso(),
      settings: this.settings.get(),
      userWords: this.repo.listUserWords(),
      reviewLogs: this.repo.listReviewLogs(),
      dayStats: this.repo.listDayStats(),
    }
  }

  import(snapshot: ImportRequest): StateResponse {
    this.repo.transaction(() => {
      this.repo.clearProgress()
      const stamp = this.clock.iso()
      snapshot.userWords.forEach(w => this.repo.upsertUserWord(w, stamp))
      snapshot.reviewLogs.forEach(l => this.repo.insertReviewLog(l, stamp))
      snapshot.dayStats.forEach(d => this.repo.upsertDayStat(d, stamp))
      this.settings.replace(snapshot.settings, stamp)
    })
    return this.progress.state()
  }

  reset(): StateResponse {
    this.repo.transaction(() => {
      this.repo.clearProgress()
      this.settings.markPlacementDone(false)
    })
    return this.progress.state()
  }
}
