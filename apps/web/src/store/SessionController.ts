import { SessionPlanner, type Grade } from '@wordmap/shared'
import { WordAction, type MutationResult } from '../api'
import { BaseController } from './BaseController'
import { SessionModel, type SessionItem, type SessionLogEntry, type SessionState } from './SessionModel'
import { NewWordAnswer, SessionItemKind, StoreConfig } from './StoreConfig'

/** Session lifecycle: start, answer (know/learn/grade with again-requeue), summary, close. */
export class SessionController extends BaseController {
  private busy = false
  private readonly model = new SessionModel()
  private readonly planner = new SessionPlanner()

  start(): void {
    const { plan, index } = this.state
    this.open(this.model.buildQueue(plan, index))
  }

  learnMore(): void {
    const ids = this.planner.learnMore(this.plannerInput(), StoreConfig.LEARN_MORE_BATCH)
    this.open(this.model.buildMoreQueue(ids, this.state.index))
  }

  startWord(wordId: string): void {
    this.open(this.model.buildQueue({ due: [wordId], fresh: [] }, this.state.index))
  }

  close(): void {
    this.ctx.set({ session: null })
  }

  know = () => this.answerNew(NewWordAnswer.Know)
  learn = () => this.answerNew(NewWordAnswer.Learn)

  async grade(grade: Grade): Promise<void> {
    const item = this.currentItem(SessionItemKind.Review)
    if (!item || this.busy) return
    await this.guarded(async () => {
      const msTaken = this.elapsed()
      const result = await this.deps.engine.recordReview({ wordId: item.wordId, grade, msTaken })
      this.commit(result)
      this.finishItem({ kind: item.kind, wordId: item.wordId, grade, firstAttempt: !item.requeued })
    })
  }

  private async answerNew(answer: NewWordAnswer): Promise<void> {
    const item = this.currentItem(SessionItemKind.New)
    if (!item || this.busy) return
    const action = answer === NewWordAnswer.Know ? WordAction.Know : WordAction.Learn
    await this.guarded(async () => {
      this.commit(await this.deps.engine.recordWordAction(item.wordId, action))
      this.finishItem({ kind: item.kind, wordId: item.wordId, answer, firstAttempt: true })
    })
  }

  private commit(result: MutationResult): void {
    const reviewLogs = result.reviewLog ? [result.reviewLog] : []
    this.applyRows({ userWords: [result.userWord], dayStats: [result.dayStat], reviewLogs })
  }

  private finishItem(entry: SessionLogEntry): void {
    const session = this.state.session
    if (!session) return
    const next = this.model.advance(session, entry, this.nowMs())
    const summary = this.model.isFinished(next) ? this.model.summarize(next, this.state.progress.streak.current) : null
    this.ctx.set({ session: { ...next, summary } })
  }

  private open(queue: SessionItem[]): void {
    const streak = this.state.progress.streak.current
    const session: SessionState = this.model.start(queue, streak, this.nowMs())
    const summary = queue.length ? null : this.model.summarize(session, streak)
    this.ctx.set({ session: { ...session, summary } })
  }

  private plannerInput() {
    const s = this.state
    const doneNew = s.dayStats.find(d => d.date === s.today)?.newLearned ?? 0
    return {
      words: s.index.words, userWords: [...s.userWords.values()], today: s.today,
      dailyNew: s.settings.dailyNew, doneNew,
    }
  }

  private currentItem(kind: SessionItemKind): SessionItem | null {
    const session = this.state.session
    const item = session && !session.summary ? this.model.current(session) : null
    return item && item.kind === kind ? item : null
  }

  private elapsed(): number {
    const session = this.state.session
    return session ? Math.max(0, this.nowMs() - session.itemShownAt) : 0
  }

  private nowMs(): number {
    return this.deps.clock().getTime()
  }

  private async guarded(job: () => Promise<void>): Promise<void> {
    this.busy = true
    try {
      await job()
    } finally {
      this.busy = false
    }
  }
}
