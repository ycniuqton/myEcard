import type {
  DayStat, KnownPoint, ReviewDayPoint, ReviewLog, StatsResponse, StatusCounts, UserWord,
} from '../../dto'
import { Grade, KnowAnswer, Status } from '../../enums'
import { DateUtil } from '../dates'
import { StreakCalculator } from './StreakCalculator'

export type StatsInput = {
  userWords: UserWord[]
  dayStats: DayStat[]
  reviewLogs: ReviewLog[]
  totalWords: number
  today: string
}

/** Pure progress statistics derived from user words, day stats and review logs. */
export class StatsCalculator {
  static readonly REVIEW_WINDOW_DAYS = 14
  static readonly PERCENT = 100
  static readonly TOMORROW = 1
  static readonly KNOWN_GRADES: ReadonlySet<string> = new Set([KnowAnswer.Know, Grade.Good, Grade.Easy])
  static readonly shared = new StatsCalculator()

  constructor(private readonly streaks = new StreakCalculator()) {}

  counts(rows: UserWord[], totalWords: number): StatusCounts {
    const c: StatusCounts = {
      [Status.Unknown]: 0, [Status.Learning]: 0, [Status.Known]: 0, [Status.Mastered]: 0,
    }
    for (const r of rows) c[r.status]++
    c[Status.Unknown] = Math.max(0, totalWords - c[Status.Learning] - c[Status.Known] - c[Status.Mastered])
    return c
  }

  percentKnown(c: StatusCounts, total: number): number {
    if (!total) return 0
    return Math.round(((c[Status.Known] + c[Status.Mastered]) / total) * StatsCalculator.PERCENT)
  }

  dueCounts(rows: UserWord[], today: string): { dueToday: number; dueTomorrow: number } {
    const tomorrow = DateUtil.addDays(today, StatsCalculator.TOMORROW)
    let dueToday = 0
    let dueTomorrow = 0
    for (const r of rows) {
      if (!r.due) continue
      if (r.due <= today) dueToday++
      else if (r.due === tomorrow) dueTomorrow++
    }
    return { dueToday, dueTomorrow }
  }

  knownOverTime(logs: ReviewLog[]): KnownPoint[] {
    const first = new Map<string, string>()
    for (const l of [...logs].sort((a, b) => a.at.localeCompare(b.at))) {
      if (StatsCalculator.KNOWN_GRADES.has(l.grade) && !first.has(l.wordId)) first.set(l.wordId, DateUtil.datePart(l.at))
    }
    const perDay = new Map<string, number>()
    for (const d of first.values()) perDay.set(d, (perDay.get(d) ?? 0) + 1)
    let total = 0
    return [...perDay.keys()].sort().map(date => ({ date, total: (total += perDay.get(date)!) }))
  }

  reviewsPerDay(
    logs: ReviewLog[],
    today: string,
    days: number = StatsCalculator.REVIEW_WINDOW_DAYS,
  ): ReviewDayPoint[] {
    const counts = new Map<string, number>()
    for (const l of logs) {
      const d = DateUtil.datePart(l.at)
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    return DateUtil.lastDays(today, days).map(date => ({ date, count: counts.get(date) ?? 0 }))
  }

  streak(days: DayStat[], today: string) {
    return this.streaks.calculate(days, today)
  }

  compute(input: StatsInput): StatsResponse {
    const counts = this.counts(input.userWords, input.totalWords)
    return {
      counts,
      percentKnown: this.percentKnown(counts, input.totalWords),
      streak: this.streak(input.dayStats, input.today),
      ...this.dueCounts(input.userWords, input.today),
      knownOverTime: this.knownOverTime(input.reviewLogs),
      reviewsPerDay: this.reviewsPerDay(input.reviewLogs, input.today),
    }
  }
}

export function streaks(days: DayStat[], today: string) {
  return StatsCalculator.shared.streak(days, today)
}

export function statusCounts(rows: UserWord[], total: number) {
  return StatsCalculator.shared.counts(rows, total)
}

export function percentKnown(c: StatusCounts, total: number) {
  return StatsCalculator.shared.percentKnown(c, total)
}

export function dueCounts(rows: UserWord[], today: string) {
  return StatsCalculator.shared.dueCounts(rows, today)
}

export function knownOverTime(logs: ReviewLog[]) {
  return StatsCalculator.shared.knownOverTime(logs)
}

export function reviewsPerDay(logs: ReviewLog[], today: string, days?: number) {
  return StatsCalculator.shared.reviewsPerDay(logs, today, days)
}
