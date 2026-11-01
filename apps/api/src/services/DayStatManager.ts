import type { DayStat } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'

export type DayBump = { isNew: boolean; dueLeft: number; dailyNew: number }

/** Rule: a day counts when all due reviews are done after some review, or the new-word goal is met. */
export class GoalRule {
  static isMet(stat: DayStat, dueLeft: number, dailyNew: number): boolean {
    if (stat.newLearned >= dailyNew) return true
    return stat.reviewed > 0 && dueLeft === 0
  }
}

/** Owns the per-day counters and their merge rules. */
export class DayStatManager {
  constructor(private readonly repo: ProgressRepository, private readonly clock: Clock) {}

  get(date: string): DayStat {
    return this.repo.getDayStat(date) ?? { date, newLearned: 0, reviewed: 0, goalMet: false }
  }

  bump(date: string, bump: DayBump): DayStat {
    const base = this.get(date)
    const next: DayStat = {
      ...base,
      newLearned: base.newLearned + (bump.isNew ? 1 : 0),
      reviewed: base.reviewed + (bump.isNew ? 0 : 1),
    }
    next.goalMet = base.goalMet || GoalRule.isMet(next, bump.dueLeft, bump.dailyNew)
    this.repo.upsertDayStat(next, this.clock.iso())
    return next
  }

  set(date: string, patch: Partial<Omit<DayStat, 'date'>>): DayStat {
    const next: DayStat = { ...this.get(date), ...patch }
    this.repo.upsertDayStat(next, this.clock.iso())
    return next
  }

  merge(incoming: DayStat): DayStat {
    const base = this.get(incoming.date)
    const next: DayStat = {
      date: incoming.date,
      newLearned: Math.max(base.newLearned, incoming.newLearned),
      reviewed: Math.max(base.reviewed, incoming.reviewed),
      goalMet: base.goalMet || incoming.goalMet,
    }
    this.repo.upsertDayStat(next, this.clock.iso())
    return next
  }
}
