import { Status } from '@wordmap/shared'
import { LearnStatus } from '../../design/status'

/** Converts contract statuses into the design palette statuses. */
export class StatusAdapter {
  private static readonly MAP: Record<Status, LearnStatus> = {
    [Status.Unknown]: LearnStatus.Unknown,
    [Status.Learning]: LearnStatus.Learning,
    [Status.Known]: LearnStatus.Known,
    [Status.Mastered]: LearnStatus.Mastered,
  }

  static toLearn(status: Status): LearnStatus {
    return StatusAdapter.MAP[status]
  }
}
