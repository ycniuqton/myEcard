import { Grade, SchedulerKind, Status } from '../../enums'
import { DateUtil } from '../dates'
import type { Card } from './Card'
import { SchedulingConfig as C } from './SchedulingConfig'
import { SchedulingStrategy, type Rng } from './SchedulingStrategy'

type Step = { ease: number; reps: number; lapses: number; interval: number }

/** Anki-style SM-2 exactly as in the product spec table. */
export class Sm2Strategy extends SchedulingStrategy {
  readonly kind = SchedulerKind.Sm2

  schedule(card: Card, grade: Grade, now: Date, rng: Rng): Card {
    const step = this.nextStep(card, grade)
    const interval = this.fuzz(step.interval, rng)
    return {
      ease: this.clampEase(step.ease),
      interval,
      reps: step.reps,
      lapses: step.lapses,
      due: DateUtil.addDays(DateUtil.iso(now), interval),
      status: this.statusFor(card.status, interval, grade),
      assumed: false,
    }
  }

  fuzz(interval: number, rng: Rng): number {
    if (interval < C.FUZZ_MIN_INTERVAL) return interval
    return Math.max(C.MIN_INTERVAL, Math.round(interval * (C.FUZZ_BASE + rng() * C.FUZZ_SPREAD)))
  }

  statusFor(prev: Status, interval: number, grade: Grade): Status {
    if (grade === Grade.Again) return Status.Learning
    if (interval >= C.MASTERED_AT) return Status.Mastered
    if (interval >= C.KNOWN_AT) return Status.Known
    return prev === Status.Known || prev === Status.Mastered ? Status.Known : Status.Learning
  }

  private clampEase(ease: number): number {
    return Math.max(C.MIN_EASE, Math.round(ease * C.EASE_PRECISION) / C.EASE_PRECISION)
  }

  private goodInterval(card: Card): number {
    if (card.reps === 0) return C.FIRST_INTERVAL
    if (card.reps === 1) return C.SECOND_INTERVAL
    return Math.round(card.interval * card.ease)
  }

  private nextStep(card: Card, grade: Grade): Step {
    const { ease, reps, lapses, interval } = card
    const handlers: Record<Grade, () => Step> = {
      [Grade.Again]: () => ({ ease: ease + C.AGAIN_EASE, reps: 0, lapses: lapses + 1, interval: C.FIRST_INTERVAL }),
      [Grade.Hard]: () => ({
        ease: ease + C.HARD_EASE, reps: reps + 1, lapses,
        interval: Math.max(C.MIN_INTERVAL, Math.round(interval * C.HARD_FACTOR)),
      }),
      [Grade.Good]: () => ({ ease, reps: reps + 1, lapses, interval: this.goodInterval(card) }),
      [Grade.Easy]: () => ({
        ease: ease + C.EASY_EASE, reps: reps + 1, lapses,
        interval: Math.max(C.MIN_INTERVAL, Math.round(this.goodInterval(card) * C.EASY_FACTOR)),
      }),
    }
    return handlers[grade]()
  }
}
