export enum DayPart {
  Morning = 'morning',
  Afternoon = 'afternoon',
  Evening = 'evening',
}

/** Copy and formatting rules for the Today screen. */
export class TodayCopy {
  static readonly MAP_KNOWN = 'of the map known'
  static readonly NEXT_WORDS = 'Next new words'
  static readonly HEADER = 'Today'
  static readonly NAME_SEPARATOR = ', '
  static readonly AFTERNOON_START = 12
  static readonly EVENING_START = 18
  static readonly LOCALE = 'en-GB'
  static readonly NUMBER_LOCALE = 'en-US'
  static readonly SEPARATOR = ' · '
  static readonly PERCENT = 100
  static readonly STREAK_KEPT = 'Streak kept today'
  static readonly STREAK_OPEN = 'Study today to keep your streak'
  static readonly DONE_TITLE = "You're done for today"
  static readonly DONE_SUB = 'Next reviews tomorrow morning'
  static readonly ESTIMATE = '~4 min'
  static readonly NOTHING_DUE = 'Nothing due'

  private static readonly GREETING: Record<DayPart, string> = {
    [DayPart.Morning]: 'Good morning',
    [DayPart.Afternoon]: 'Good afternoon',
    [DayPart.Evening]: 'Good evening',
  }

  static dayPart(now: Date): DayPart {
    const h = now.getHours()
    if (h >= TodayCopy.EVENING_START) return DayPart.Evening
    return h >= TodayCopy.AFTERNOON_START ? DayPart.Afternoon : DayPart.Morning
  }

  static greeting(now: Date, name = ''): string {
    const base = TodayCopy.GREETING[TodayCopy.dayPart(now)]
    return name ? `${base}${TodayCopy.NAME_SEPARATOR}${name}` : base
  }

  static dateLine(now: Date): string {
    const weekday = now.toLocaleDateString(TodayCopy.LOCALE, { weekday: 'long' })
    const rest = now.toLocaleDateString(TodayCopy.LOCALE, { day: 'numeric', month: 'long' })
    return `${weekday}, ${rest}`
  }

  static fmt(n: number): string {
    return n.toLocaleString(TodayCopy.NUMBER_LOCALE)
  }

  static plural(n: number, one: string, many: string): string {
    return `${TodayCopy.fmt(n)} ${n === 1 ? one : many}`
  }

  static dueLine(reviews: number, fresh: number): string {
    const parts: string[] = []
    if (reviews > 0) parts.push(TodayCopy.plural(reviews, 'review', 'reviews'))
    if (fresh > 0) parts.push(TodayCopy.plural(fresh, 'new word', 'new words'))
    return parts.length ? parts.join(TodayCopy.SEPARATOR) : TodayCopy.NOTHING_DUE
  }

  static percent(known: number, total: number): number {
    return total > 0 ? Math.round((known / total) * TodayCopy.PERCENT) : 0
  }
}
