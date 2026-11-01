import { SettingsLimits, type DayStat, type ReviewLog, type Settings, type UserWord } from '@wordmap/shared'
import type { SqlClient, SqlExecutor, SqlParam, SqlRow } from '../db/SqlClient'
import { ProgressQueries } from './ProgressQueries'
import { ProgressRepository, type StoredSettings } from './ProgressRepository'
import {
  RowMapper, type DayStatRow, type ReviewLogRow, type SettingsRow, type UserWordRow,
} from './RowMapper'

export class BatchLimits {
  static readonly USER_WORD_ROWS = 400
  static readonly USER_WORD_COLUMNS = 12
}

export enum ProgressTable {
  UserWords = 'user_words',
  ReviewLogs = 'review_logs',
  DayStats = 'day_stats',
}

/** Postgres implementation of the progress contract, bound to one user id. */
export class PgProgressRepository extends ProgressRepository {
  private executor: SqlExecutor
  private inTransaction = false

  constructor(private readonly client: SqlClient, private readonly userId: string) {
    super()
    this.executor = client
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.inTransaction) return work()
    return this.client.transaction(async tx => {
      this.executor = tx
      this.inTransaction = true
      try {
        return await work()
      } finally {
        this.executor = this.client
        this.inTransaction = false
      }
    })
  }

  private async rows<R extends SqlRow>(sql: string, ...params: SqlParam[]): Promise<R[]> {
    return (await this.executor.query<R>(sql, [this.userId, ...params])).rows
  }

  private async first<R extends SqlRow>(sql: string, ...params: SqlParam[]): Promise<R | null> {
    return (await this.rows<R>(sql, ...params))[0] ?? null
  }

  async getSettings(): Promise<StoredSettings | null> {
    const row = await this.first<SettingsRow>(ProgressQueries.SELECT_SETTINGS)
    return row ? RowMapper.settings(row) : null
  }

  async saveSettings(s: Settings, updatedAt: string, syncedAt: string): Promise<void> {
    const name = SettingsLimits.learnerName(s.learnerName)
    await this.rows(
      ProgressQueries.UPSERT_SETTINGS, s.dailyNew, s.reminderTime ?? null, s.theme, s.voice, s.activeListId,
      s.placementDone, name, updatedAt, syncedAt,
    )
  }

  async getUserWord(wordId: string): Promise<UserWord | null> {
    const row = await this.first<UserWordRow>(ProgressQueries.SELECT_USER_WORD, wordId)
    return row ? RowMapper.userWord(row) : null
  }

  async listUserWords(): Promise<UserWord[]> {
    return (await this.rows<UserWordRow>(ProgressQueries.LIST_USER_WORDS)).map(RowMapper.userWord)
  }

  async userWordsSince(since: string): Promise<UserWord[]> {
    return (await this.rows<UserWordRow>(ProgressQueries.USER_WORDS_SINCE, since)).map(RowMapper.userWord)
  }

  async upsertUserWord(w: UserWord, syncedAt: string): Promise<void> {
    await this.rows(
      ProgressQueries.UPSERT_USER_WORD, w.wordId, w.status, w.assumed, w.ease, w.interval, w.reps, w.lapses,
      w.due, w.firstSeenAt ?? null, w.updatedAt, syncedAt,
    )
  }

  async upsertUserWords(words: UserWord[], syncedAt: string): Promise<void> {
    const unique = [...new Map(words.map(w => [w.wordId, w])).values()]
    for (let from = 0; from < unique.length; from += BatchLimits.USER_WORD_ROWS) {
      await this.upsertUserWordChunk(unique.slice(from, from + BatchLimits.USER_WORD_ROWS), syncedAt)
    }
  }

  private async upsertUserWordChunk(chunk: UserWord[], syncedAt: string): Promise<void> {
    const params = chunk.flatMap(w => [
      this.userId, w.wordId, w.status, w.assumed, w.ease, w.interval, w.reps, w.lapses, w.due,
      w.firstSeenAt ?? null, w.updatedAt, syncedAt,
    ])
    await this.executor.query(ProgressQueries.userWordsBatch(chunk.length, BatchLimits.USER_WORD_COLUMNS), params)
  }

  async getReviewLog(id: string): Promise<ReviewLog | null> {
    const row = await this.first<ReviewLogRow>(ProgressQueries.SELECT_REVIEW_LOG, id)
    return row ? RowMapper.reviewLog(row) : null
  }

  async insertReviewLog(l: ReviewLog, receivedAt: string): Promise<boolean> {
    const result = await this.executor.query(ProgressQueries.INSERT_REVIEW_LOG, [
      this.userId, l.id, l.wordId, l.at, l.mode, l.grade, l.msTaken ?? null, receivedAt,
    ])
    return result.rowCount === 1
  }

  async listReviewLogs(): Promise<ReviewLog[]> {
    return (await this.rows<ReviewLogRow>(ProgressQueries.LIST_REVIEW_LOGS)).map(RowMapper.reviewLog)
  }

  async reviewLogsSince(since: string): Promise<ReviewLog[]> {
    return (await this.rows<ReviewLogRow>(ProgressQueries.REVIEW_LOGS_SINCE, since)).map(RowMapper.reviewLog)
  }

  async getDayStat(date: string): Promise<DayStat | null> {
    const row = await this.first<DayStatRow>(ProgressQueries.SELECT_DAY_STAT, date)
    return row ? RowMapper.dayStat(row) : null
  }

  async listDayStats(): Promise<DayStat[]> {
    return (await this.rows<DayStatRow>(ProgressQueries.LIST_DAY_STATS)).map(RowMapper.dayStat)
  }

  async dayStatsSince(since: string): Promise<DayStat[]> {
    return (await this.rows<DayStatRow>(ProgressQueries.DAY_STATS_SINCE, since)).map(RowMapper.dayStat)
  }

  async upsertDayStat(s: DayStat, updatedAt: string): Promise<void> {
    await this.rows(ProgressQueries.UPSERT_DAY_STAT, s.date, s.newLearned, s.reviewed, s.goalMet, updatedAt)
  }

  async clearProgress(): Promise<void> {
    for (const table of Object.values(ProgressTable)) await this.rows(ProgressQueries.deleteByUser(table))
  }
}
