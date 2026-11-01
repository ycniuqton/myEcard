import type { ReviewLog, SyncChanges, SyncPayload, SyncResponse, UserWord } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'
import type { DayStatManager } from './DayStatManager'
import type { SettingsManager } from './SettingsManager'

type Applied = { words: Set<string>; logs: Set<string>; settings: boolean; days: number }

/** Merges offline client changes (last-writer-wins per row, idempotent logs) and returns server changes. */
export class SyncManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly settings: SettingsManager,
    private readonly days: DayStatManager,
    private readonly clock: Clock,
  ) {}

  sync(payload: SyncPayload): SyncResponse {
    return this.repo.transaction(() => {
      const serverTime = this.clock.iso()
      const applied = this.apply(payload.changes)
      return { serverChanges: this.collect(payload.since, applied), serverTime }
    })
  }

  private apply(changes: SyncChanges): Applied {
    return {
      words: this.applyWords(changes.userWords),
      logs: this.applyLogs(changes.reviewLogs),
      days: changes.dayStats.map(d => this.days.merge(d)).length,
      settings: this.applySettings(changes),
    }
  }

  private applyWords(incoming: UserWord[]): Set<string> {
    const applied = new Set<string>()
    for (const word of incoming) {
      const existing = this.repo.getUserWord(word.wordId)
      if (existing && existing.updatedAt >= word.updatedAt) continue
      this.repo.upsertUserWord(word, this.clock.iso())
      applied.add(word.wordId)
    }
    return applied
  }

  private applyLogs(incoming: ReviewLog[]): Set<string> {
    const received = new Set<string>()
    for (const log of incoming) {
      if (this.repo.insertReviewLog(log, this.clock.iso())) received.add(log.id)
    }
    return received
  }

  private applySettings(changes: SyncChanges): boolean {
    if (!changes.settings) return false
    const stamp = changes.settingsUpdatedAt ?? this.clock.iso()
    return this.settings.applyIfNewer(changes.settings, stamp)
  }

  private collect(since: string, applied: Applied): SyncChanges {
    const changes: SyncChanges = {
      userWords: this.repo.userWordsSince(since).filter(w => !applied.words.has(w.wordId)),
      reviewLogs: this.repo.reviewLogsSince(since).filter(l => !applied.logs.has(l.id)),
      dayStats: this.repo.dayStatsSince(since),
    }
    const syncedAt = this.settings.syncedAt()
    if (!applied.settings && syncedAt !== null && syncedAt > since) {
      changes.settings = this.settings.get()
      changes.settingsUpdatedAt = this.settings.updatedAt() ?? undefined
    }
    return changes
  }
}
