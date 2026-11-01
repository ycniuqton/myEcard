import { DateUtil } from '@wordmap/shared'
import type { KnownPoint, ReviewDayPoint } from '@wordmap/shared'

export type BarSpec = { date: string; count: number; heightPct: number; current: boolean }
export type LineSeries = { values: number[]; points: string; gain: number; startDate: string; endDate: string }

/** Turns raw stats points into chart-ready geometry for the Progress screen. */
export class ProgressSeries {
  static readonly WINDOW_DAYS = 30
  static readonly VIEW_WIDTH = 300
  static readonly VIEW_HEIGHT = 110
  static readonly TOP_PAD = 5
  static readonly BOTTOM_PAD = 5
  static readonly MIN_BAR_PCT = 4
  static readonly FULL_PCT = 100
  static readonly FLAT_RANGE = 1
  static readonly DECIMALS = 1

  static knownSeries(points: KnownPoint[], knownNow: number, today: string): LineSeries {
    const dates = DateUtil.lastDays(today, ProgressSeries.WINDOW_DAYS)
    const logged = ProgressSeries.carry(points, dates)
    const base = Math.max(0, knownNow - logged[logged.length - 1])
    const values = logged.map(v => base + v)
    return {
      values,
      points: ProgressSeries.polyline(values),
      gain: values[values.length - 1] - values[0],
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    }
  }

  static bars(points: ReviewDayPoint[]): BarSpec[] {
    const max = Math.max(0, ...points.map(p => p.count))
    return points.map((p, i) => ({
      date: p.date,
      count: p.count,
      current: i === points.length - 1,
      heightPct: ProgressSeries.barHeight(p.count, max),
    }))
  }

  static polyline(values: number[]): string {
    const lo = Math.min(...values)
    const range = Math.max(Math.max(...values) - lo, ProgressSeries.FLAT_RANGE)
    const usable = ProgressSeries.VIEW_HEIGHT - ProgressSeries.TOP_PAD - ProgressSeries.BOTTOM_PAD
    const last = Math.max(values.length - 1, 1)
    return values
      .map((v, i) => {
        const x = (i / last) * ProgressSeries.VIEW_WIDTH
        const y = ProgressSeries.VIEW_HEIGHT - ProgressSeries.BOTTOM_PAD - ((v - lo) / range) * usable
        return `${x.toFixed(ProgressSeries.DECIMALS)},${y.toFixed(ProgressSeries.DECIMALS)}`
      })
      .join(' ')
  }

  static dayLabel(date: string): string {
    const [y, m, d] = DateUtil.parts(date)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  static daysLabel(n: number): string {
    return `${n} ${n === 1 ? 'day' : 'days'}`
  }

  private static barHeight(count: number, max: number): number {
    if (max === 0) return ProgressSeries.MIN_BAR_PCT
    return Math.max(ProgressSeries.MIN_BAR_PCT, (count / max) * ProgressSeries.FULL_PCT)
  }

  private static carry(points: KnownPoint[], dates: string[]): number[] {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
    let cursor = 0
    let total = 0
    return dates.map(date => {
      while (cursor < sorted.length && sorted[cursor].date <= date) total = sorted[cursor++].total
      return total
    })
  }
}
