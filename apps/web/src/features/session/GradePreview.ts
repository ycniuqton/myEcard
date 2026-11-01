import { CardFactory, Grade, SchedulerManager, type Card, type UserWord } from '@wordmap/shared'
import { SessionCopy } from './SessionCopy'

export type GradeOption = { grade: Grade; interval: string }

/** Previews the next interval of every grade using the real scheduler. */
export class GradePreview {
  private static readonly GRADES: readonly Grade[] = [Grade.Again, Grade.Hard, Grade.Good, Grade.Easy]
  private static readonly MIDPOINT_RNG = () => 0.5
  private static readonly DAYS_PER_MONTH = 30
  private static readonly DAYS_PER_YEAR = 365
  private static readonly YEAR_PRECISION = 10

  constructor(private readonly scheduler: SchedulerManager = new SchedulerManager()) {}

  options(userWord: UserWord | undefined, now: Date): GradeOption[] {
    const card: Card = userWord ?? CardFactory.learning(now)
    return GradePreview.GRADES.map(grade => ({ grade, interval: this.label(card, grade, now) }))
  }

  format(days: number): string {
    const { DAYS_PER_MONTH, DAYS_PER_YEAR, YEAR_PRECISION } = GradePreview
    if (days < DAYS_PER_MONTH) return `${days}d`
    if (days < DAYS_PER_YEAR) return `${Math.round(days / DAYS_PER_MONTH)}mo`
    return `${Math.round((days / DAYS_PER_YEAR) * YEAR_PRECISION) / YEAR_PRECISION}y`
  }

  private label(card: Card, grade: Grade, now: Date): string {
    if (grade === Grade.Again) return SessionCopy.AGAIN_LABEL
    const next = this.scheduler.schedule(card, grade, now, GradePreview.MIDPOINT_RNG)
    return this.format(next.interval)
  }
}
