import { DateUtil, StatsCalculator, type StatsResponse } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'
import type { ContentManager } from './ContentManager'

/** Computes progress statistics for a date from stored progress. */
export class StatsManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly content: ContentManager,
    private readonly clock: Clock,
    private readonly calculator = new StatsCalculator(),
  ) {}

  compute(date?: string): StatsResponse {
    return this.calculator.compute({
      userWords: this.repo.listUserWords(),
      dayStats: this.repo.listDayStats(),
      reviewLogs: this.repo.listReviewLogs(),
      totalWords: this.content.words.length,
      today: date ?? DateUtil.iso(this.clock.now()),
    })
  }
}
