import type { ExportSnapshot, ImportRequest, StateResponse } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'
import type { DayStatManager } from './DayStatManager'
import type { ProgressManager } from './ProgressManager'
import type { SettingsManager } from './SettingsManager'

export class SnapshotFormat {
  static readonly VERSION = 1
}

/** Exports, imports and resets the whole progress snapshot of one user. */
export class DataTransferManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly settings: SettingsManager,
    private readonly days: DayStatManager,
    private readonly progress: ProgressManager,
    private readonly clock: Clock,
  ) {}

  async export(): Promise<ExportSnapshot> {
    return {
      version: SnapshotFormat.VERSION,
      exportedAt: this.clock.iso(),
      settings: await this.settings.get(),
      userWords: await this.repo.listUserWords(),
      reviewLogs: await this.repo.listReviewLogs(),
      dayStats: await this.repo.listDayStats(),
    }
  }

  async import(snapshot: ImportRequest): Promise<StateResponse> {
    await this.repo.transaction(async () => {
      await this.repo.clearProgress()
      const stamp = this.clock.iso()
      await this.repo.upsertUserWords(snapshot.userWords, stamp)
      for (const l of snapshot.reviewLogs) await this.repo.insertReviewLog(l, stamp)
      for (const d of snapshot.dayStats) await this.repo.upsertDayStat(d, stamp)
      await this.settings.replace(snapshot.settings, stamp)
    })
    return this.progress.state()
  }

  async reset(): Promise<StateResponse> {
    await this.repo.transaction(async () => {
      await this.repo.clearProgress()
      await this.settings.markPlacementDone(false)
    })
    return this.progress.state()
  }
}
