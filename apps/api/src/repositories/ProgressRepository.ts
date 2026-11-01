import type { DayStat, ReviewLog, Settings, UserWord } from '@wordmap/shared'

export type StoredSettings = { settings: Settings; updatedAt: string; syncedAt: string }

/** Storage contract for one user's progress; every call is async and implicitly scoped to that user. */
export abstract class ProgressRepository {
  abstract transaction<T>(work: () => Promise<T>): Promise<T>

  abstract getSettings(): Promise<StoredSettings | null>
  abstract saveSettings(settings: Settings, updatedAt: string, syncedAt: string): Promise<void>

  abstract getUserWord(wordId: string): Promise<UserWord | null>
  abstract listUserWords(): Promise<UserWord[]>
  abstract userWordsSince(since: string): Promise<UserWord[]>
  abstract upsertUserWord(word: UserWord, syncedAt: string): Promise<void>
  abstract upsertUserWords(words: UserWord[], syncedAt: string): Promise<void>

  abstract getReviewLog(id: string): Promise<ReviewLog | null>
  abstract insertReviewLog(log: ReviewLog, receivedAt: string): Promise<boolean>
  abstract listReviewLogs(): Promise<ReviewLog[]>
  abstract reviewLogsSince(since: string): Promise<ReviewLog[]>

  abstract getDayStat(date: string): Promise<DayStat | null>
  abstract listDayStats(): Promise<DayStat[]>
  abstract dayStatsSince(since: string): Promise<DayStat[]>
  abstract upsertDayStat(stat: DayStat, updatedAt: string): Promise<void>

  abstract clearProgress(): Promise<void>
}
