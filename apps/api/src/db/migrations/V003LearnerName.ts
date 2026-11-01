import type BetterSqlite3 from 'better-sqlite3'
import { Migration } from '../Migration'

/** Adds the optional learner name to the settings record. */
export class V003LearnerName extends Migration {
  static readonly VERSION = 3
  static readonly NAME = 'learner-name'
  static readonly DDL = "ALTER TABLE settings ADD COLUMN learner_name TEXT NOT NULL DEFAULT ''"

  readonly version = V003LearnerName.VERSION
  readonly name = V003LearnerName.NAME

  up(db: BetterSqlite3.Database): void {
    db.exec(V003LearnerName.DDL)
  }
}
