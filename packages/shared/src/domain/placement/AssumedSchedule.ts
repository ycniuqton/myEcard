import { DateUtil } from '../dates'
import { SchedulingConfig } from '../scheduling/SchedulingConfig'

/** Spreads the first check of assumed-known words over a month so reviews do not pile up. */
export class AssumedSchedule {
  static readonly SPREAD_DAYS = 30

  static due(rank: number, today: string): string {
    const offset = SchedulingConfig.ASSUMED_CHECK_DAYS + (rank % AssumedSchedule.SPREAD_DAYS)
    return DateUtil.addDays(today, offset)
  }
}

export function assumedDue(rank: number, today: string): string {
  return AssumedSchedule.due(rank, today)
}
