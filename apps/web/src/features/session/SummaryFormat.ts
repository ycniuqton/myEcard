import { SessionCopy } from './SessionCopy'

/** Formats summary numbers for display. */
export class SummaryFormat {
  static accuracy(value: number | null): string {
    return value === null ? SessionCopy.NO_ACCURACY : `${value}%`
  }

  static streakNote(increased: boolean): string {
    return increased ? SessionCopy.STREAK_PLUS : SessionCopy.STREAK_NOTE
  }
}
