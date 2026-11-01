import {
  CardFactory, DateUtil, ReviewMode, SchedulerManager, SessionPlanner, Status,
  type Card, type DayStat, type DayUpdateRequest, type ReviewLog, type ReviewRequest, type ReviewResponse,
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

  async state(): Promise<StateResponse> {
    return {
      settings: await this.settings.get(),
      userWords: await this.repo.listUserWords(),
      dayStats: await this.repo.listDayStats(),
      reviewLogs: await this.repo.listReviewLogs(),
      serverTime: this.clock.iso(),
    }
  }

  async know(wordId: string): Promise<UserWord> {
    this.content.require(wordId)
    const card: Card = { ...CardFactory.assumedKnown(this.clock.now()), assumed: false }
    return this.save(wordId, card, (await this.repo.getUserWord(wordId))?.firstSeenAt)
  }

  async learn(wordId: string): Promise<UserWord> {
    this.content.require(wordId)
    const firstSeenAt = (await this.repo.getUserWord(wordId))?.firstSeenAt
    return this.save(wordId, CardFactory.learning(this.clock.now()), firstSeenAt)
  }

  async reset(wordId: string): Promise<null> {
    this.content.require(wordId)
    await this.save(wordId, CardFactory.fresh())
    return null
  }

  async resetMany(wordIds: string[]): Promise<void> {
    const stamp = this.clock.iso()
    const rows = wordIds.map(wordId => ({ ...CardFactory.fresh(), wordId, updatedAt: stamp }))
    await this.repo.upsertUserWords(rows, stamp)
  }

  review(req: ReviewRequest): Promise<ReviewResponse> {
    return this.repo.transaction(async () => {
      const replay = await this.repo.getReviewLog(req.clientId)
      if (replay) return this.replay(replay)
      this.content.require(req.wordId)
      const prev = await this.repo.getUserWord(req.wordId)
      const userWord = await this.applyGrade(prev, req)
      await this.repo.insertReviewLog(this.toLog(req), this.clock.iso())
      return { userWord, dayStat: await this.bumpDay(prev, req) }
    })
  }

  updateDay(req: DayUpdateRequest): Promise<DayStat> {
    const { date, ...patch } = req
    return this.days.set(date, patch)
  }

  private async bumpDay(prev: UserWord | null, req: ReviewRequest): Promise<DayStat> {
    const date = DateUtil.iso(new Date(req.at))
    const dueLeft = this.planner.dueIds(await this.repo.listUserWords(), date).length
    return this.days.bump(date, {
      isNew: this.isNewCard(prev), dueLeft, dailyNew: (await this.settings.get()).dailyNew,
    })
  }

  private async replay(log: ReviewLog): Promise<ReviewResponse> {
    const userWord = (await this.repo.getUserWord(log.wordId)) as UserWord
    return { userWord, dayStat: await this.days.get(DateUtil.iso(new Date(log.at))) }
  }

  private async applyGrade(prev: UserWord | null, req: ReviewRequest): Promise<UserWord> {
    if (prev && prev.updatedAt > req.at) return prev
    const started = prev && prev.status !== Status.Unknown
    const card = started ? prev : CardFactory.learning(new Date(req.at))
    const next = this.scheduler.schedule(card, req.grade, new Date(req.at))
    const row: UserWord = {
      ...next, wordId: req.wordId, firstSeenAt: prev?.firstSeenAt ?? req.at, updatedAt: req.at,
    }
    await this.repo.upsertUserWord(row, this.clock.iso())
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

  private async save(wordId: string, card: Card, firstSeenAt?: string): Promise<UserWord> {
    const row: UserWord = { ...card, wordId, updatedAt: this.clock.iso() }
    if (firstSeenAt) row.firstSeenAt = firstSeenAt
    await this.repo.upsertUserWord(row, row.updatedAt)
    return row
  }
}
