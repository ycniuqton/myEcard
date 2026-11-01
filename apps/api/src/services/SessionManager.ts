import { SessionPlanner, type SessionResponse } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { ContentManager } from './ContentManager'
import type { DayStatManager } from './DayStatManager'
import type { SettingsManager } from './SettingsManager'

/** Builds the daily session for a date from content, progress and the daily goal. */
export class SessionManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly content: ContentManager,
    private readonly settings: SettingsManager,
    private readonly days: DayStatManager,
    private readonly planner = new SessionPlanner(),
  ) {}

  plan(date: string): SessionResponse {
    return this.planner.plan({
      words: this.content.words,
      userWords: this.repo.listUserWords(),
      today: date,
      dailyNew: this.settings.get().dailyNew,
      doneNew: this.days.get(date).newLearned,
    })
  }
}
