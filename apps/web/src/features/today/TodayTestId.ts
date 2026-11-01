/** data-testid values on the Today screen. */
export class TodayTestId {
  static readonly Screen = 'today-screen'
  static readonly Greeting = 'today-greeting'
  static readonly Streak = 'streak-count'
  static readonly Flame = 'streak-flame'
  static readonly Percent = 'known-percent'
  static readonly KnownCount = 'known-count'
  static readonly MapCard = 'today-map-card'
  static readonly SeeMap = 'see-map'
  static readonly DueLine = 'due-line'
  static readonly Start = 'start-session'
  static readonly Done = 'today-done'
  static readonly LearnMore = 'learn-more'

  static nextWord(rank: number): string {
    return `next-word-${rank}`
  }
}
