import { Grade, type SessionResponse, type Word } from '@wordmap/shared'
import { NewWordAnswer, SessionItemKind, StoreConfig } from './StoreConfig'
import type { WordIndex } from './WordIndex'

export type SessionItem = { kind: SessionItemKind; wordId: string; rank: number; requeued: boolean }

export type SessionLogEntry = {
  kind: SessionItemKind
  wordId: string
  grade?: Grade
  answer?: NewWordAnswer
  firstAttempt: boolean
}

export type SessionSummary = {
  reviewed: number
  newLearned: number
  known: number
  accuracy: number | null
  streak: number
  streakIncreased: boolean
  newWordIds: string[]
}

export type SessionState = {
  queue: SessionItem[]
  index: number
  log: SessionLogEntry[]
  summary: SessionSummary | null
  streakBefore: number
  itemShownAt: number
}

/** Pure session rules: queue building, again-requeue, advancing and the end summary. */
export class SessionModel {
  buildQueue(plan: Pick<SessionResponse, 'due' | 'fresh'>, index: WordIndex): SessionItem[] {
    return [
      ...this.items(plan.due, SessionItemKind.Review, index),
      ...this.items(plan.fresh, SessionItemKind.New, index),
    ]
  }

  buildMoreQueue(ids: string[], index: WordIndex): SessionItem[] {
    return this.items(ids, SessionItemKind.New, index)
  }

  start(queue: SessionItem[], streakBefore: number, nowMs: number): SessionState {
    return { queue, index: 0, log: [], summary: null, streakBefore, itemShownAt: nowMs }
  }

  current(session: SessionState): SessionItem | null {
    return session.queue[session.index] ?? null
  }

  advance(session: SessionState, entry: SessionLogEntry, nowMs: number): SessionState {
    const requeue = entry.grade === Grade.Again
    const item = session.queue[session.index]
    const queue = requeue ? [...session.queue, { ...item, requeued: true }] : session.queue
    return { ...session, queue, index: session.index + 1, log: [...session.log, entry], itemShownAt: nowMs }
  }

  isFinished(session: SessionState): boolean {
    return session.index >= session.queue.length
  }

  summarize(session: SessionState, streakNow: number): SessionSummary {
    const reviews = session.log.filter(l => l.kind === SessionItemKind.Review && l.firstAttempt)
    const news = session.log.filter(l => l.kind === SessionItemKind.New)
    const passed = reviews.filter(l => l.grade !== Grade.Again).length
    return {
      reviewed: reviews.length,
      newLearned: news.filter(l => l.answer === NewWordAnswer.Learn).length,
      known: news.filter(l => l.answer === NewWordAnswer.Know).length,
      accuracy: reviews.length ? Math.round((passed / reviews.length) * StoreConfig.PERCENT) : null,
      streak: streakNow,
      streakIncreased: streakNow > session.streakBefore,
      newWordIds: news.map(l => l.wordId),
    }
  }

  private items(ids: string[], kind: SessionItemKind, index: WordIndex): SessionItem[] {
    return ids
      .map(id => index.byId.get(id))
      .filter((w): w is Word => !!w)
      .map(w => ({ kind, wordId: w.id, rank: w.rank, requeued: false }))
  }
}
