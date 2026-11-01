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

  async apply(submission: PlacementSubmission): Promise<PlacementResponse> {
    this.validateLevel(submission.level)
    const tapped = submission.tappedKnownIds.filter(id => this.content.has(id))
    const ids = this.engine.knownIdsForLevel(this.content.words, submission.level, tapped)
    await this.repo.transaction(async () => {
      await this.clearAssumed()
      await this.assumeAll(ids)
      await this.logProbes(submission)
      await this.settings.markPlacementDone(true)
    })
    return { knownCount: ids.length, state: await this.progress.state() }
  }

  private validateLevel(level: number): void {
    if (level > this.content.words.length) {
      throw AppError.validation(`level must be between 0 and ${this.content.words.length}`)
    }
  }

  private async clearAssumed(): Promise<void> {
    const assumed = (await this.repo.listUserWords()).filter(w => w.assumed && w.status === Status.Known)
    await this.progress.resetMany(assumed.map(w => w.wordId))
  }

  private async assumeAll(ids: string[]): Promise<void> {
    const existing = new Map((await this.repo.listUserWords()).map(w => [w.wordId, w]))
    const now = this.clock.now()
    const rows = ids
      .filter(id => (existing.get(id)?.status ?? Status.Unknown) === Status.Unknown)
      .map(id => this.assumedRow(id, now))
    await this.repo.upsertUserWords(rows, now.toISOString())
  }

  private assumedRow(wordId: string, now: Date): UserWord {
    const due = AssumedSchedule.due(this.content.require(wordId).rank, DateUtil.iso(now))
    return { ...CardFactory.assumedKnown(now), due, wordId, updatedAt: now.toISOString() }
  }

  private async logProbes(submission: PlacementSubmission): Promise<void> {
    const at = this.clock.iso()
    const answers = submission.probes.flatMap(p => p.answers).filter(a => this.content.has(a.wordId))
    for (const a of answers) await this.repo.insertReviewLog(this.toLog(a, at), at)
  }

  private toLog(answer: BandAnswer, at: string): ReviewLog {
    return {
      id: `${ReviewMode.Placement}:${answer.wordId}:${at}`, wordId: answer.wordId, at, mode: ReviewMode.Placement,
      grade: answer.known ? KnowAnswer.Know : KnowAnswer.DontKnow,
    }
  }
}
