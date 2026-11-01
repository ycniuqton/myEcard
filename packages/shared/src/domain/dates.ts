/** Numeric and formatting constants of calendar-date handling. */
export class DateConstants {
  static readonly MS_PER_DAY = 86_400_000
  static readonly PAD_WIDTH = 2
  static readonly PAD_CHAR = '0'
  static readonly DATE_PART_LENGTH = 10
}

/** Calendar-date arithmetic on local ISO dates (YYYY-MM-DD). */
export class DateUtil {
  static iso(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(DateConstants.PAD_WIDTH, DateConstants.PAD_CHAR)
    const day = String(d.getDate()).padStart(DateConstants.PAD_WIDTH, DateConstants.PAD_CHAR)
    return `${d.getFullYear()}-${m}-${day}`
  }

  static parts(date: string): [number, number, number] {
    const [y, m, d] = date.split('-').map(Number)
    return [y, m, d]
  }

  static addDays(date: string, days: number): string {
    const [y, m, d] = DateUtil.parts(date)
    return DateUtil.iso(new Date(y, m - 1, d + days))
  }

  static daysBetween(a: string, b: string): number {
    const [ay, am, ad] = DateUtil.parts(a)
    const [by, bm, bd] = DateUtil.parts(b)
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DateConstants.MS_PER_DAY)
  }

  static datePart(timestamp: string): string {
    if (timestamp.length <= DateConstants.DATE_PART_LENGTH) return timestamp
    const instant = new Date(timestamp)
    return Number.isNaN(instant.getTime()) ? timestamp.slice(0, DateConstants.DATE_PART_LENGTH) : DateUtil.iso(instant)
  }

  static lastDays(today: string, count: number): string[] {
    return Array.from({ length: count }, (_, i) => DateUtil.addDays(today, i - count + 1))
  }
}

export function isoDate(d: Date): string {
  return DateUtil.iso(d)
}

export function addDays(date: string, days: number): string {
  return DateUtil.addDays(date, days)
}

export function daysBetween(a: string, b: string): number {
  return DateUtil.daysBetween(a, b)
}
