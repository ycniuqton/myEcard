import type BetterSqlite3 from 'better-sqlite3'
import { Migration } from '../Migration'

/** Creates the progress tables for the personal account. */
export class V001InitialSchema extends Migration {
  static readonly VERSION = 1
  static readonly NAME = 'initial-schema'
  static readonly DDL = `
      CREATE TABLE user_words (
        user_id TEXT NOT NULL, word_id TEXT NOT NULL, status TEXT NOT NULL, assumed INTEGER NOT NULL,
        ease REAL NOT NULL, interval INTEGER NOT NULL, reps INTEGER NOT NULL, lapses INTEGER NOT NULL,
        due TEXT, first_seen_at TEXT, updated_at TEXT NOT NULL, synced_at TEXT NOT NULL,
        PRIMARY KEY (user_id, word_id)
      );
      CREATE TABLE review_logs (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, word_id TEXT NOT NULL, at TEXT NOT NULL,
        mode TEXT NOT NULL, grade TEXT NOT NULL, ms_taken INTEGER, received_at TEXT NOT NULL
      );
      CREATE TABLE day_stats (
        user_id TEXT NOT NULL, date TEXT NOT NULL, new_learned INTEGER NOT NULL, reviewed INTEGER NOT NULL,
        goal_met INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, date)
      );
      CREATE TABLE settings (
        user_id TEXT PRIMARY KEY, daily_new INTEGER NOT NULL, reminder_time TEXT, theme TEXT NOT NULL,
        voice TEXT NOT NULL, active_list_id TEXT NOT NULL, placement_done INTEGER NOT NULL,
        updated_at TEXT NOT NULL, synced_at TEXT NOT NULL
      );
    `

  readonly version = V001InitialSchema.VERSION
  readonly name = V001InitialSchema.NAME

  up(db: BetterSqlite3.Database): void {
    db.exec(V001InitialSchema.DDL)
  }
}
