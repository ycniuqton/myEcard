import { SchedulerKind, type Grade } from '../../enums'
import type { Card } from './Card'
import { Sm2Strategy } from './Sm2Strategy'
import type { Rng, SchedulingStrategy } from './SchedulingStrategy'

/** Selects the scheduling strategy by configuration; the only entry point for scheduling. */
export class SchedulerManager {
  static readonly shared = new SchedulerManager()

  private readonly strategies = new Map<string, SchedulingStrategy>()

  constructor(private kind: string = SchedulerKind.Sm2, extra: SchedulingStrategy[] = []) {
    for (const s of [new Sm2Strategy(), ...extra]) this.strategies.set(s.kind, s)
  }

  use(kind: string): void {
    this.resolve(kind)
    this.kind = kind
  }

  schedule(card: Card, grade: Grade, now: Date, rng: Rng = Math.random): Card {
    return this.resolve(this.kind).schedule(card, grade, now, rng)
  }

  private resolve(kind: string): SchedulingStrategy {
    const found = this.strategies.get(kind)
    if (!found) throw new Error(`Unknown scheduler: ${kind}`)
    return found
  }
}

export function schedule(card: Card, grade: Grade, now: Date, rng?: Rng): Card {
  return SchedulerManager.shared.schedule(card, grade, now, rng)
}
