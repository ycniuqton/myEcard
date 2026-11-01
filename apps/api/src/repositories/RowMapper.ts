import type {
  DayStat, ReviewGrade, ReviewLog, ReviewMode, Settings, Status, Theme, UserWord, Voice,
} from '@wordmap/shared'
import type { StoredSettings } from './ProgressRepository'

export type UserWordRow = {
  word_id: string; status: string; assumed: number; ease: number; interval: number; reps: number
  lapses: number; due: string | null; first_seen_at: string | null; updated_at: string
}
export type ReviewLogRow = {
  id: string; word_id: string; at: string; mode: string; grade: string; ms_taken: number | null
}
export type DayStatRow = { date: string; new_learned: number; reviewed: number; goal_met: number }
export type SettingsRow = {
  daily_new: number; reminder_time: string | null; theme: string; voice: string
  active_list_id: string; placement_done: number; learner_name: string; updated_at: string; synced_at: string
}

/** Converts between SQLite rows and shared DTOs. */
export class RowMapper {
  static userWord(r: UserWordRow): UserWord {
    const word: UserWord = {
      wordId: r.word_id, status: r.status as Status, assumed: r.assumed === 1, ease: r.ease,
      interval: r.interval, reps: r.reps, lapses: r.lapses, due: r.due, updatedAt: r.updated_at,
    }
    if (r.first_seen_at) word.firstSeenAt = r.first_seen_at
    return word
  }

  static reviewLog(r: ReviewLogRow): ReviewLog {
    const log: ReviewLog = {
      id: r.id, wordId: r.word_id, at: r.at, mode: r.mode as ReviewMode, grade: r.grade as ReviewGrade,
    }
    if (r.ms_taken !== null) log.msTaken = r.ms_taken
    return log
  }

  static dayStat(r: DayStatRow): DayStat {
    return { date: r.date, newLearned: r.new_learned, reviewed: r.reviewed, goalMet: r.goal_met === 1 }
  }

  static settings(r: SettingsRow): StoredSettings {
    const settings: Settings = {
      dailyNew: r.daily_new, theme: r.theme as Theme, voice: r.voice as Voice,
      activeListId: r.active_list_id, placementDone: r.placement_done === 1,
    }
    if (r.reminder_time) settings.reminderTime = r.reminder_time
    if (r.learner_name) settings.learnerName = r.learner_name
    return { settings, updatedAt: r.updated_at, syncedAt: r.synced_at }
  }
}
