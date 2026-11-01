import type { DayStat, ReviewLog, Settings, UserWord } from '@wordmap/shared'

export class UserIds {
  static readonly ME = 'me'
}

export type StoredSettings = { settings: Settings; updatedAt: string; syncedAt: string }

/** Storage contract for all user progress; business logic depends only on this class. */
export abstract class ProgressRepository {
  abstract transaction<T>(work: () => T): T

  abstract getSettings(): StoredSettings | null
  abstract saveSettings(settings: Settings, updatedAt: string, syncedAt: string): void

  abstract getUserWord(wordId: string): UserWord | null
  abstract listUserWords(): UserWord[]
  abstract userWordsSince(since: string): UserWord[]
  abstract upsertUserWord(word: UserWord, syncedAt: string): void

  abstract getReviewLog(id: string): ReviewLog | null
  abstract insertReviewLog(log: ReviewLog, receivedAt: string): boolean
  abstract listReviewLogs(): ReviewLog[]
  abstract reviewLogsSince(since: string): ReviewLog[]

  abstract getDayStat(date: string): DayStat | null
  abstract listDayStats(): DayStat[]
  abstract dayStatsSince(since: string): DayStat[]
  abstract upsertDayStat(stat: DayStat, updatedAt: string): void

  abstract clearProgress(): void
}
