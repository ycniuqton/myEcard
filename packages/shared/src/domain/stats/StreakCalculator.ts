import type { DayStat, StreakInfo } from '../../dto'
import { DateUtil } from '../dates'

/** Streak of consecutive goal-met days; alive when today or yesterday is met. */
export class StreakCalculator {
  static readonly CONSECUTIVE = 1
  static readonly RUN_START = 1
  static readonly YESTERDAY = -1

  calculate(days: DayStat[], today: string): StreakInfo {
    const met = new Set(days.filter(d => d.goalMet).map(d => d.date))
    return { current: this.current(met, today), best: this.best(met) }
  }

  private best(met: Set<string>): number {
    let best = 0
    let run = 0
    let prev: string | null = null
    for (const d of [...met].sort()) {
      run = prev && DateUtil.daysBetween(prev, d) === StreakCalculator.CONSECUTIVE ? run + 1 : StreakCalculator.RUN_START
      best = Math.max(best, run)
      prev = d
    }
    return best
  }

  private current(met: Set<string>, today: string): number {
    let cursor = met.has(today) ? today : DateUtil.addDays(today, StreakCalculator.YESTERDAY)
    let count = 0
    while (met.has(cursor)) {
      count++
      cursor = DateUtil.addDays(cursor, StreakCalculator.YESTERDAY)
    }
    return count
  }
}
