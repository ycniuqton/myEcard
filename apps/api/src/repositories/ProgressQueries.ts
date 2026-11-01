/** SQL text of the progress storage (Postgres placeholders), grouped by table. */
export class ProgressQueries {
  static readonly SELECT_SETTINGS = 'SELECT * FROM settings WHERE user_id = $1'
  static readonly UPSERT_SETTINGS = `
      INSERT INTO settings (user_id, daily_new, reminder_time, theme, voice, active_list_id, placement_done, learner_name, updated_at, synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET daily_new = excluded.daily_new, reminder_time = excluded.reminder_time,
        theme = excluded.theme, voice = excluded.voice, active_list_id = excluded.active_list_id,
        placement_done = excluded.placement_done, learner_name = excluded.learner_name, updated_at = excluded.updated_at, synced_at = excluded.synced_at
    `
  static readonly SELECT_USER_WORD = 'SELECT * FROM user_words WHERE user_id = $1 AND word_id = $2'
  static readonly LIST_USER_WORDS = 'SELECT * FROM user_words WHERE user_id = $1 ORDER BY word_id'
  static readonly USER_WORDS_SINCE = 'SELECT * FROM user_words WHERE user_id = $1 AND synced_at > $2 ORDER BY word_id'
  static readonly UPSERT_USER_WORD = `
      INSERT INTO user_words (user_id, word_id, status, assumed, ease, "interval", reps, lapses, due, first_seen_at, updated_at, synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id, word_id) DO UPDATE SET status = excluded.status, assumed = excluded.assumed,
        ease = excluded.ease, "interval" = excluded."interval", reps = excluded.reps, lapses = excluded.lapses,
        due = excluded.due, first_seen_at = excluded.first_seen_at, updated_at = excluded.updated_at,
        synced_at = excluded.synced_at
    `
  static readonly UPSERT_USER_WORDS_HEAD =
    'INSERT INTO user_words (user_id, word_id, status, assumed, ease, "interval", reps, lapses, due, first_seen_at, updated_at, synced_at) VALUES '
  static readonly UPSERT_USER_WORDS_TAIL = `
      ON CONFLICT (user_id, word_id) DO UPDATE SET status = excluded.status, assumed = excluded.assumed,
        ease = excluded.ease, "interval" = excluded."interval", reps = excluded.reps, lapses = excluded.lapses,
        due = excluded.due, first_seen_at = excluded.first_seen_at, updated_at = excluded.updated_at,
        synced_at = excluded.synced_at
    `
  static readonly SELECT_REVIEW_LOG = 'SELECT * FROM review_logs WHERE user_id = $1 AND id = $2'
  static readonly INSERT_REVIEW_LOG = `
      INSERT INTO review_logs (user_id, id, word_id, at, mode, grade, ms_taken, received_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, id) DO NOTHING
    `
  static readonly LIST_REVIEW_LOGS = 'SELECT * FROM review_logs WHERE user_id = $1 ORDER BY at, id'
  static readonly REVIEW_LOGS_SINCE = 'SELECT * FROM review_logs WHERE user_id = $1 AND received_at > $2 ORDER BY at, id'
  static readonly SELECT_DAY_STAT = 'SELECT * FROM day_stats WHERE user_id = $1 AND date = $2'
  static readonly LIST_DAY_STATS = 'SELECT * FROM day_stats WHERE user_id = $1 ORDER BY date'
  static readonly DAY_STATS_SINCE = 'SELECT * FROM day_stats WHERE user_id = $1 AND updated_at > $2 ORDER BY date'
  static readonly UPSERT_DAY_STAT = `
      INSERT INTO day_stats (user_id, date, new_learned, reviewed, goal_met, updated_at) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, date) DO UPDATE SET new_learned = excluded.new_learned, reviewed = excluded.reviewed,
        goal_met = excluded.goal_met, updated_at = excluded.updated_at
    `

  static userWordsBatch(rows: number, columns: number): string {
    const tuples = Array.from({ length: rows }, (_, r) => {
      const offset = r * columns
      const marks = Array.from({ length: columns }, (_c, c) => `$${offset + c + 1}`)
      return `(${marks.join(', ')})`
    })
    return ProgressQueries.UPSERT_USER_WORDS_HEAD + tuples.join(', ') + ProgressQueries.UPSERT_USER_WORDS_TAIL
  }

  static deleteByUser(table: string): string {
    return `DELETE FROM ${table} WHERE user_id = $1`
  }
}
