import {
  CardFactory, DateUtil, ReviewMode, SchedulerManager, SessionPlanner, Status,
  type Card, type DayUpdateRequest, type ReviewLog, type ReviewRequest, type ReviewResponse,
  type StateResponse, type UserWord,
} from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'
import type { ContentManager } from './ContentManager'
import type { DayStatManager } from './DayStatManager'
import type { SettingsManager } from './SettingsManager'

/** Word-level progress actions: know, learn, reset, graded review, day counters and full state. */
export class ProgressManager {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly content: ContentManager,
    private readonly scheduler: SchedulerManager,
    private readonly settings: SettingsManager,
    private readonly days: DayStatManager,
    private readonly clock: Clock,
    private readonly planner = new SessionPlanner(),
  ) {}

  state(): StateResponse {
    return {
      settings: this.settings.get(),
      userWords: this.repo.listUserWords(),
      dayStats: this.repo.listDayStats(),
      reviewLogs: this.repo.listReviewLogs(),
      serverTime: this.clock.iso(),
    }
  }

  know(wordId: string): UserWord {
    this.content.require(wordId)
    const card: Card = { ...CardFactory.assumedKnown(this.clock.now()), assumed: false }
    return this.save(wordId, card, this.repo.getUserWord(wordId)?.firstSeenAt)
  }

  learn(wordId: string): UserWord {
    this.content.require(wordId)
    return this.save(wordId, CardFactory.learning(this.clock.now()), this.repo.getUserWord(wordId)?.firstSeenAt)
  }

  reset(wordId: string): null {
    this.content.require(wordId)
    this.save(wordId, CardFactory.fresh())
    return null
  }

  review(req: ReviewRequest): ReviewResponse {
    return this.repo.transaction(() => {
      const replay = this.repo.getReviewLog(req.clientId)
      if (replay) return this.replay(replay)
      this.content.require(req.wordId)
      const prev = this.repo.getUserWord(req.wordId)
      const userWord = this.applyGrade(prev, req)
      this.repo.insertReviewLog(this.toLog(req), this.clock.iso())
      const date = DateUtil.iso(new Date(req.at))
      const dayStat = this.days.bump(date, {
        isNew: this.isNewCard(prev),
        dueLeft: this.planner.dueIds(this.repo.listUserWords(), date).length,
        dailyNew: this.settings.get().dailyNew,
      })
      return { userWord, dayStat }
    })
  }

  updateDay(req: DayUpdateRequest) {
    const { date, ...patch } = req
    return this.days.set(date, patch)
  }

  private replay(log: ReviewLog): ReviewResponse {
    const userWord = this.repo.getUserWord(log.wordId) as UserWord
    return { userWord, dayStat: this.days.get(DateUtil.iso(new Date(log.at))) }
  }

  private applyGrade(prev: UserWord | null, req: ReviewRequest): UserWord {
    if (prev && prev.updatedAt > req.at) return prev
    const started = prev && prev.status !== Status.Unknown
    const card = started ? prev : CardFactory.learning(new Date(req.at))
    const next = this.scheduler.schedule(card, req.grade, new Date(req.at))
    const row: UserWord = {
      ...next, wordId: req.wordId, firstSeenAt: prev?.firstSeenAt ?? req.at, updatedAt: req.at,
    }
    this.repo.upsertUserWord(row, this.clock.iso())
    return row
  }

  private isNewCard(prev: UserWord | null): boolean {
    if (!prev || prev.status === Status.Unknown) return true
    return prev.firstSeenAt === undefined && prev.reps === 0 && !prev.assumed
  }

  private toLog(req: ReviewRequest): ReviewLog {
    const log: ReviewLog = {
      id: req.clientId, wordId: req.wordId, at: req.at, mode: ReviewMode.Flashcard, grade: req.grade,
    }
    if (req.msTaken !== undefined) log.msTaken = req.msTaken
    return log
  }

  private save(wordId: string, card: Card, firstSeenAt?: string): UserWord {
    const row: UserWord = { ...card, wordId, updatedAt: this.clock.iso() }
    if (firstSeenAt) row.firstSeenAt = firstSeenAt
    this.repo.upsertUserWord(row, row.updatedAt)
    return row
  }
}
