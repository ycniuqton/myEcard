import {
  CardFactory, ReviewMode, SchedulerManager, Status, type Card, type DayStat, type Grade, type ReviewLog,
  type UserWord,
} from '@wordmap/shared'
import { WordAction } from './ApiConfig'

export type DayDelta = { newLearned?: number; reviewed?: number; goalMet?: boolean }

/** Computes optimistic local rows for each user mutation using the shared scheduler. */
export class LocalMutator {
  constructor(private readonly scheduler: SchedulerManager = SchedulerManager.shared) {}

  review(wordId: string, current: UserWord | undefined, grade: Grade, now: Date): UserWord {
    const card = this.scheduler.schedule(this.cardOf(current), grade, now)
    return this.toRow(wordId, card, current, now)
  }

  wordAction(wordId: string, current: UserWord | undefined, action: WordAction, now: Date): UserWord {
    return this.toRow(wordId, this.cardFor(action, now), current, now)
  }

  assumedKnown(wordId: string, current: UserWord | undefined, now: Date): UserWord {
    return this.toRow(wordId, CardFactory.assumedKnown(now), current, now)
  }

  reviewLog(clientId: string, wordId: string, grade: Grade, now: Date, msTaken?: number): ReviewLog {
    return { id: clientId, wordId, at: now.toISOString(), mode: ReviewMode.Flashcard, grade, msTaken }
  }

  day(current: DayStat | undefined, date: string, delta: DayDelta): DayStat {
    const base = current ?? { date, newLearned: 0, reviewed: 0, goalMet: false }
    return {
      date,
      newLearned: base.newLearned + (delta.newLearned ?? 0),
      reviewed: base.reviewed + (delta.reviewed ?? 0),
      goalMet: base.goalMet || (delta.goalMet ?? false),
    }
  }

  private cardFor(action: WordAction, now: Date): Card {
    if (action === WordAction.Reset) return CardFactory.fresh()
    if (action === WordAction.Learn) return CardFactory.learning(now)
    return CardFactory.assumedKnown(now)
  }

  private cardOf(row: UserWord | undefined): Card {
    return row ? { ...row } : CardFactory.fresh()
  }

  private toRow(wordId: string, card: Card, current: UserWord | undefined, now: Date): UserWord {
    const stamp = now.toISOString()
    const started = card.status !== Status.Unknown
    return {
      wordId,
      status: card.status,
      assumed: card.assumed,
      ease: card.ease,
      interval: card.interval,
      reps: card.reps,
      lapses: card.lapses,
      due: card.due,
      firstSeenAt: current?.firstSeenAt ?? (started ? stamp : undefined),
      updatedAt: stamp,
    }
  }
}
