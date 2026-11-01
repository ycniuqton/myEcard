import { SettingsLimits, type DayStat, type ReviewLog, type Settings, type UserWord } from '@wordmap/shared'
import type { Database } from '../db/Database'
import { ProgressQueries } from './ProgressQueries'
import { ProgressRepository, UserIds, type StoredSettings } from './ProgressRepository'
import {
  RowMapper, type DayStatRow, type ReviewLogRow, type SettingsRow, type UserWordRow,
} from './RowMapper'

export enum ProgressTable {
  UserWords = 'user_words',
  ReviewLogs = 'review_logs',
  DayStats = 'day_stats',
}

/** better-sqlite3 implementation of the progress storage contract. */
export class SqliteProgressRepository extends ProgressRepository {
  constructor(private readonly database: Database) {
    super()
  }

  private get db() {
    return this.database.raw
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work)()
  }

  getSettings(): StoredSettings | null {
    const row = this.db.prepare(ProgressQueries.SELECT_SETTINGS).get(UserIds.ME) as SettingsRow | undefined
    return row ? RowMapper.settings(row) : null
  }

  saveSettings(s: Settings, updatedAt: string, syncedAt: string): void {
    const name = SettingsLimits.learnerName(s.learnerName)
    this.db.prepare(ProgressQueries.UPSERT_SETTINGS).run(UserIds.ME, s.dailyNew, s.reminderTime ?? null, s.theme, s.voice, s.activeListId, s.placementDone ? 1 : 0, name, updatedAt, syncedAt)
  }

  getUserWord(wordId: string): UserWord | null {
    const row = this.db.prepare(ProgressQueries.SELECT_USER_WORD).get(UserIds.ME, wordId) as
      | UserWordRow
      | undefined
    return row ? RowMapper.userWord(row) : null
  }

  listUserWords(): UserWord[] {
    const rows = this.db.prepare(ProgressQueries.LIST_USER_WORDS).all(UserIds.ME)
    return (rows as UserWordRow[]).map(RowMapper.userWord)
  }

  userWordsSince(since: string): UserWord[] {
    const rows = this.db
      .prepare(ProgressQueries.USER_WORDS_SINCE)
      .all(UserIds.ME, since)
    return (rows as UserWordRow[]).map(RowMapper.userWord)
  }

  upsertUserWord(w: UserWord, syncedAt: string): void {
    this.db.prepare(ProgressQueries.UPSERT_USER_WORD).run(UserIds.ME, w.wordId, w.status, w.assumed ? 1 : 0, w.ease, w.interval, w.reps, w.lapses, w.due,
      w.firstSeenAt ?? null, w.updatedAt, syncedAt)
  }

  getReviewLog(id: string): ReviewLog | null {
    const row = this.db.prepare(ProgressQueries.SELECT_REVIEW_LOG).get(id) as ReviewLogRow | undefined
    return row ? RowMapper.reviewLog(row) : null
  }

  insertReviewLog(l: ReviewLog, receivedAt: string): boolean {
    const result = this.db.prepare(ProgressQueries.INSERT_REVIEW_LOG).run(l.id, UserIds.ME, l.wordId, l.at, l.mode, l.grade, l.msTaken ?? null, receivedAt)
    return result.changes === 1
  }

  listReviewLogs(): ReviewLog[] {
    const rows = this.db.prepare(ProgressQueries.LIST_REVIEW_LOGS).all(UserIds.ME)
    return (rows as ReviewLogRow[]).map(RowMapper.reviewLog)
  }

  reviewLogsSince(since: string): ReviewLog[] {
    const rows = this.db
      .prepare(ProgressQueries.REVIEW_LOGS_SINCE)
      .all(UserIds.ME, since)
    return (rows as ReviewLogRow[]).map(RowMapper.reviewLog)
  }

  getDayStat(date: string): DayStat | null {
    const row = this.db.prepare(ProgressQueries.SELECT_DAY_STAT).get(UserIds.ME, date) as
      | DayStatRow
      | undefined
    return row ? RowMapper.dayStat(row) : null
  }

  listDayStats(): DayStat[] {
    const rows = this.db.prepare(ProgressQueries.LIST_DAY_STATS).all(UserIds.ME)
    return (rows as DayStatRow[]).map(RowMapper.dayStat)
  }

  dayStatsSince(since: string): DayStat[] {
    const rows = this.db
      .prepare(ProgressQueries.DAY_STATS_SINCE)
      .all(UserIds.ME, since)
    return (rows as DayStatRow[]).map(RowMapper.dayStat)
  }

  upsertDayStat(s: DayStat, updatedAt: string): void {
    this.db.prepare(ProgressQueries.UPSERT_DAY_STAT).run(UserIds.ME, s.date, s.newLearned, s.reviewed, s.goalMet ? 1 : 0, updatedAt)
  }

  clearProgress(): void {
    for (const table of Object.values(ProgressTable)) {
      this.db.prepare(ProgressQueries.deleteByUser(table)).run(UserIds.ME)
    }
  }
}
