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

  sync(payload: SyncPayload): Promise<SyncResponse> {
    return this.repo.transaction(async () => {
      const serverTime = this.clock.iso()
      const applied = await this.apply(payload.changes)
      return { serverChanges: await this.collect(payload.since, applied), serverTime }
    })
  }

  private async apply(changes: SyncChanges): Promise<Applied> {
    const words = await this.applyWords(changes.userWords)
    const logs = await this.applyLogs(changes.reviewLogs)
    for (const d of changes.dayStats) await this.days.merge(d)
    return { words, logs, days: changes.dayStats.length, settings: await this.applySettings(changes) }
  }

  private async applyWords(incoming: UserWord[]): Promise<Set<string>> {
    const applied = new Set<string>()
    for (const word of incoming) {
      const existing = await this.repo.getUserWord(word.wordId)
      if (existing && existing.updatedAt >= word.updatedAt) continue
      await this.repo.upsertUserWord(word, this.clock.iso())
      applied.add(word.wordId)
    }
    return applied
  }

  private async applyLogs(incoming: ReviewLog[]): Promise<Set<string>> {
    const received = new Set<string>()
    for (const log of incoming) {
      if (await this.repo.insertReviewLog(log, this.clock.iso())) received.add(log.id)
    }
    return received
  }

  private async applySettings(changes: SyncChanges): Promise<boolean> {
    if (!changes.settings) return false
    const stamp = changes.settingsUpdatedAt ?? this.clock.iso()
    return this.settings.applyIfNewer(changes.settings, stamp)
  }

  private async collect(since: string, applied: Applied): Promise<SyncChanges> {
    const words = await this.repo.userWordsSince(since)
    const logs = await this.repo.reviewLogsSince(since)
    const changes: SyncChanges = {
      userWords: words.filter(w => !applied.words.has(w.wordId)),
      reviewLogs: logs.filter(l => !applied.logs.has(l.id)),
      dayStats: await this.repo.dayStatsSince(since),
    }
    const syncedAt = await this.settings.syncedAt()
    if (!applied.settings && syncedAt !== null && syncedAt > since) {
      changes.settings = await this.settings.get()
      changes.settingsUpdatedAt = (await this.settings.updatedAt()) ?? undefined
    }
    return changes
  }
}
