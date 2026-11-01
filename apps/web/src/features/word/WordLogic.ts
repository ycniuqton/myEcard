import { DateUtil, Grade, KnowAnswer, Status } from '@wordmap/shared'
import type { ReviewLog } from '@wordmap/shared'

export type ExampleParts = { before: string; match: string; after: string }

const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g
const ESCAPE_REPLACEMENT = '\\$&'

/** Splits an example sentence around the studied word (or one of its forms). */
export class ExampleSplitter {
  static split(text: string, lemma: string, forms: readonly string[] = []): ExampleParts {
    const candidates = [lemma, ...forms].filter(Boolean).sort((a, b) => b.length - a.length)
    const pattern = candidates.map((c) => c.replace(REGEX_ESCAPE, ESCAPE_REPLACEMENT)).join('|')
    const hit = pattern ? new RegExp(`\\b(${pattern})\\b`, 'i').exec(text) : null
    if (!hit) return { before: text, match: '', after: '' }
    const end = hit.index + hit[0].length
    return { before: text.slice(0, hit.index), match: hit[0], after: text.slice(end) }
  }
}

/** Wording and thresholds for the "Next review" row. */
class ReviewLabels {
  static readonly NOT_STARTED = 'Not started'
  static readonly NOT_SCHEDULED = 'Not scheduled'
  static readonly TODAY = 'Today'
  static readonly TOMORROW = 'Tomorrow'
  static readonly DAYS_PER_WEEK = 7
  static readonly DAYS_PER_MONTH = 30
  static readonly WEEKS_FROM_DAYS = 14
  static readonly MONTHS_FROM_DAYS = 60
}

/** Turns a due date into the design's relative label (Tomorrow, In 4 days, In 3 weeks). */
export class NextReviewLabel {
  static of(status: Status, due: string | null, today: string): string {
    if (status === Status.Unknown) return ReviewLabels.NOT_STARTED
    if (!due) return ReviewLabels.NOT_SCHEDULED
    return NextReviewLabel.relative(DateUtil.daysBetween(today, DateUtil.datePart(due)))
  }

  private static relative(days: number): string {
    if (days <= 0) return ReviewLabels.TODAY
    if (days === 1) return ReviewLabels.TOMORROW
    if (days < ReviewLabels.WEEKS_FROM_DAYS) return `In ${days} days`
    if (days < ReviewLabels.MONTHS_FROM_DAYS) return `In ${Math.round(days / ReviewLabels.DAYS_PER_WEEK)} weeks`
    return `In ${Math.round(days / ReviewLabels.DAYS_PER_MONTH)} months`
  }
}

const HISTORY_COLOR: Record<string, string> = {
  [Grade.Again]: 'var(--again)',
  [Grade.Hard]: 'var(--hard)',
  [Grade.Good]: 'var(--good)',
  [Grade.Easy]: 'var(--easy)',
  [KnowAnswer.Know]: 'var(--good)',
  [KnowAnswer.DontKnow]: 'var(--again)',
}

/** Picks the most recent review grades of one word as dot colors, oldest first. */
export class HistoryDots {
  static readonly MAX_DOTS = 12

  static colors(logs: readonly ReviewLog[], wordId: string): string[] {
    return logs
      .filter((l) => l.wordId === wordId)
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-HistoryDots.MAX_DOTS)
      .map((l) => HISTORY_COLOR[l.grade])
      .filter(Boolean)
  }
}
