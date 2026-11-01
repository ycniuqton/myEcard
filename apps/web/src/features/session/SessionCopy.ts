/** User-facing copy and tunables of the session and summary screens. */
export class SessionCopy {
  static readonly GRADE_TEST_ID_PREFIX = 'grade-'
  static readonly REVIEW_LABEL = 'Review'
  static readonly REVEAL_HINT = 'Tap anywhere to reveal'
  static readonly SHOW_ANSWER = 'Show answer'
  static readonly NEW_WORD = 'New word'
  static readonly KNOW_IT = 'I already know it'
  static readonly LEARN_IT = 'Learn it'
  static readonly CLOSE = 'Close session'
  static readonly AGAIN_LABEL = '<10m'
  static readonly SUMMARY_KICKER = 'Session complete'
  static readonly SUMMARY_TITLE = 'Nice work'
  static readonly SUMMARY_END = '.'
  static readonly NEW_WORDS = 'new words'
  static readonly REVIEWS_DONE = 'reviews done'
  static readonly ACCURACY = 'accuracy'
  static readonly STREAK_NOTE = 'day streak'
  static readonly STREAK_PLUS = 'day streak · +1'
  static readonly TODAY_WORDS = "Today's new words"
  static readonly SEE_MAP = 'See my map'
  static readonly DONE = 'Done'
  static readonly NO_ACCURACY = '—'
  static readonly LETTERS = 'letters'
  static readonly SEPARATOR = ' · '
  static readonly FRONT_PARAM = 'front'
  static readonly FLIP_EASING = 'transform 350ms cubic-bezier(.34,1.3,.5,1)'

  static summaryTitle(name = ''): string {
    const middle = name ? `, ${name}` : ''
    return `${SessionCopy.SUMMARY_TITLE}${middle}${SessionCopy.SUMMARY_END}`
  }
}

export enum FrontMode {
  Word = 'word',
  Cloze = 'cloze',
}

export enum SessionTestId {
  Close = 'close-session',
  Progress = 'session-progress',
  Counter = 'session-counter',
  FlipCard = 'flip-card',
  FrontWord = 'front-word',
  FrontCloze = 'front-cloze',
  BackWord = 'back-word',
  ShowAnswer = 'show-answer',
  NewCard = 'new-card',
  KnowIt = 'know-it',
  LearnIt = 'learn-it',
  Say = 'say-word',
  SayExample = 'say-example',
  SummaryTitle = 'summary-title',
  SummaryNew = 'summary-new',
  SummaryReviews = 'summary-reviews',
  SummaryAccuracy = 'summary-accuracy',
  SummaryStreak = 'summary-streak',
  SummaryStreakNote = 'summary-streak-note',
  SummaryWord = 'summary-word',
  SeeMap = 'see-map',
  Done = 'summary-done',
}
