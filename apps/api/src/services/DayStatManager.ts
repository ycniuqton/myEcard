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

  async get(date: string): Promise<DayStat> {
    return (await this.repo.getDayStat(date)) ?? { date, newLearned: 0, reviewed: 0, goalMet: false }
  }

  async bump(date: string, bump: DayBump): Promise<DayStat> {
    const base = await this.get(date)
    const next: DayStat = {
      ...base,
      newLearned: base.newLearned + (bump.isNew ? 1 : 0),
      reviewed: base.reviewed + (bump.isNew ? 0 : 1),
    }
    next.goalMet = base.goalMet || GoalRule.isMet(next, bump.dueLeft, bump.dailyNew)
    await this.repo.upsertDayStat(next, this.clock.iso())
    return next
  }

  async set(date: string, patch: Partial<Omit<DayStat, 'date'>>): Promise<DayStat> {
    const next: DayStat = { ...(await this.get(date)), ...patch }
    await this.repo.upsertDayStat(next, this.clock.iso())
    return next
  }

  async merge(incoming: DayStat): Promise<DayStat> {
    const base = await this.get(incoming.date)
    const next: DayStat = {
      date: incoming.date,
      newLearned: Math.max(base.newLearned, incoming.newLearned),
      reviewed: Math.max(base.reviewed, incoming.reviewed),
      goalMet: base.goalMet || incoming.goalMet,
    }
    await this.repo.upsertDayStat(next, this.clock.iso())
    return next
  }
}
