import {
  AdaptivePlacementEngine, AssumedSchedule, CardFactory, DateUtil, KnowAnswer, ReviewMode, Status,
  type BandAnswer, type PlacementResponse, type PlacementSubmission, type ReviewLog, type UserWord,
} from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import { AppError } from './AppError'
import type { Clock } from './Clock'
import type { ContentManager } from './ContentManager'
import type { ProgressManager } from './ProgressManager'
import type { SettingsManager } from './SettingsManager'

/** Applies an adaptive placement result: assumed-known words with spread check dates, probe logs, flag. */
export class PlacementManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly content: ContentManager,
    private readonly settings: SettingsManager,
    private readonly progress: ProgressManager,
    private readonly clock: Clock,
    private readonly engine = new AdaptivePlacementEngine(),
  ) {}

  apply(submission: PlacementSubmission): PlacementResponse {
    this.validateLevel(submission.level)
    const tapped = submission.tappedKnownIds.filter(id => this.content.has(id))
    const ids = this.engine.knownIdsForLevel(this.content.words, submission.level, tapped)
    this.repo.transaction(() => {
      this.clearAssumed()
      ids.forEach(id => this.assume(id))
      this.logProbes(submission)
      this.settings.markPlacementDone(true)
    })
    return { knownCount: ids.length, state: this.progress.state() }
  }

  private validateLevel(level: number): void {
    if (level > this.content.words.length) {
      throw AppError.validation(`level must be between 0 and ${this.content.words.length}`)
    }
  }

  private clearAssumed(): void {
    this.repo
      .listUserWords()
      .filter(w => w.assumed && w.status === Status.Known)
      .forEach(w => this.progress.reset(w.wordId))
  }

  private assume(wordId: string): void {
    const existing = this.repo.getUserWord(wordId)
    if (existing && existing.status !== Status.Unknown) return
    const now = this.clock.now()
    const due = AssumedSchedule.due(this.content.require(wordId).rank, DateUtil.iso(now))
    const row: UserWord = { ...CardFactory.assumedKnown(now), due, wordId, updatedAt: now.toISOString() }
    this.repo.upsertUserWord(row, row.updatedAt)
  }

  private logProbes(submission: PlacementSubmission): void {
    const at = this.clock.iso()
    const answers = submission.probes.flatMap(p => p.answers).filter(a => this.content.has(a.wordId))
    answers.forEach(a => this.repo.insertReviewLog(this.toLog(a, at), at))
  }

  private toLog(answer: BandAnswer, at: string): ReviewLog {
    return {
      id: `${ReviewMode.Placement}:${answer.wordId}:${at}`, wordId: answer.wordId, at, mode: ReviewMode.Placement,
      grade: answer.known ? KnowAnswer.Know : KnowAnswer.DontKnow,
    }
  }
}
