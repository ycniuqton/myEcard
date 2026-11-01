/** data-testid values on the Progress screen. */
export class ProgressTestId {
  static readonly Screen = 'progress-screen'
  static readonly CurrentStreak = 'current-streak'
  static readonly BestStreak = 'best-streak'
  static readonly KnownChart = 'known-chart'
  static readonly Line = 'known-line'
  static readonly Gain = 'known-gain'
  static readonly Reviews = 'reviews-chart'
  static readonly DueTomorrow = 'due-tomorrow'

  static bar(date: string): string {
    return `review-bar-${date}`
  }

  static count(status: string): string {
    return `count-${status}`
  }
}
