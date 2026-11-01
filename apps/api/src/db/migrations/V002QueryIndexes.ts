import type BetterSqlite3 from 'better-sqlite3'
import { Migration } from '../Migration'

/** Adds indexes for since-queries and per-user log lookups. */
export class V002QueryIndexes extends Migration {
  static readonly VERSION = 2
  static readonly NAME = 'query-indexes'
  static readonly DDL = `
      CREATE INDEX idx_user_words_synced ON user_words (user_id, synced_at);
      CREATE INDEX idx_review_logs_received ON review_logs (user_id, received_at);
      CREATE INDEX idx_review_logs_word ON review_logs (user_id, word_id);
      CREATE INDEX idx_day_stats_updated ON day_stats (user_id, updated_at);
    `

  readonly version = V002QueryIndexes.VERSION
  readonly name = V002QueryIndexes.NAME

  up(db: BetterSqlite3.Database): void {
    db.exec(V002QueryIndexes.DDL)
  }
}
