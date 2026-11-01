import type { Grade } from '../../enums'
import type { Card } from './Card'

export type Rng = () => number

/** Base class for spaced-repetition algorithms (SM-2 now, FSRS later). */
export abstract class SchedulingStrategy {
  abstract readonly kind: string
  abstract schedule(card: Card, grade: Grade, now: Date, rng: Rng): Card
}
