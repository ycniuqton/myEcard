import type { PlacementSubmission } from '@wordmap/shared'

/** User-facing copy and tunables of the welcome and placement screens. */
export class OnboardingCopy {
  static readonly BRAND = 'myEcard'
  static readonly WELCOME_TITLE = 'Learn the words that matter most.'
  static readonly WELCOME_SUB = 'The most useful English words, laid out as a map you fill in one day at a time.'
  static readonly PERKS: readonly (readonly [string, string])[] = [
    ['See your map', 'Every word is a tile. Watch it turn from grey to colour.'],
    ['Five minutes a day', 'A few new words and the reviews that are due, nothing more.'],
    ['Start where you are', 'A 3-minute word check marks what you already know.'],
  ]
  static readonly TAKE_TEST = 'Take the word check'
  static readonly SKIP = 'Skip, start from word 1'
  static readonly SKIP_SUBMISSION: PlacementSubmission = { level: 0, tappedKnownIds: [], probes: [] }
  static readonly SKIP_FAILED = 'Could not save your choice. Try again.'

  static readonly INTRO_KICKER = 'Word check'
  static readonly INTRO_TITLE = 'Which words do you know?'
  static readonly INTRO_SUB = 'You will see single words, seven at a time, easy to hard. Tap Know or Don\'t know, or swipe the card.'
  static readonly INTRO_STEPS: readonly string[] = ['About 3 minutes', 'It zooms in on your level as you answer', 'Made-up words are mixed in, so only tap Know when you are sure']
  static readonly RETAKE_NOTE = 'Retaking replaces the words marked known by your earlier word check. Words you learned in sessions stay as they are.'
  static readonly BEGIN = 'Begin'
  static readonly CANCEL = 'Not now'

  static readonly CLOSE = 'Leave word check'
  static readonly KNOW = 'I know it'
  static readonly DONT_KNOW = "Don't know"
  static readonly SWIPE_HINT = 'Swipe right to know, left to skip'
  static readonly PRONOUNCE = 'Pronounce'
  static readonly FINISH_NOW = 'Finish now'
  static readonly PROGRESS_LABEL = 'Check progress'
  static readonly ITEM_OF = 'of'

  static readonly RESULT_KICKER = 'Word check complete'
  static readonly RESULT_LEAD = 'Your level is about rank'
  static readonly MAP_LEAD = 'About'
  static readonly MAP_LABEL = 'of the map known'
  static readonly MARKED_LABEL = 'words will be marked known'
  static readonly SLIDER_LABEL = 'Adjust your level'
  static readonly SLIDER_HINT = 'Words above your level stay unknown; when you meet ones you know, tap I know it. Not quite right? Drag to move your level.'
  static readonly SAVING = 'Saving your map...'
  static readonly SAVE_FAILED = 'Could not save your result. Try again.'
  static readonly ACCEPT = 'Accept and start learning'
  static readonly RETAKE = 'Retake the check'

  static readonly SWIPE_THRESHOLD = 80
  static readonly TILT_DIVISOR = 22
  static readonly PERCENT = 100
  static readonly LOCALE = 'en-US'
}
export enum OnboardingTestId {
  Welcome = 'welcome',
  TakeTest = 'take-placement',
  Skip = 'skip-placement',
  Intro = 'placement-intro',
  Begin = 'begin-placement',
  Cancel = 'cancel-placement',
  Screen = 'placement-screen',
  Close = 'close-placement',
  Dots = 'placement-dots',
  FinishNow = 'placement-finish-now',
  Card = 'probe-card',
  Word = 'probe-word',
  Say = 'probe-say',
  Know = 'probe-know',
  DontKnow = 'probe-dont-know',
  Result = 'placement-result',
  Level = 'placement-level',
  Percent = 'placement-percent',
  Marked = 'placement-marked',
  Slider = 'placement-slider',
  Accept = 'placement-accept',
  Retake = 'placement-retake',
  Failed = 'placement-failed',
}

export enum PlacementPhase {
  Intro = 'intro',
  Asking = 'asking',
  Result = 'result',
}


