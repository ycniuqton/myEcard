import { Status } from '@wordmap/shared'
import { LearnStatus } from '../../design/status'

/** Converts the shared domain status to the design palette status. */
export class StatusMap {
  private static readonly LEARN_STATUS: Record<Status, LearnStatus> = {
    [Status.Unknown]: LearnStatus.Unknown,
    [Status.Learning]: LearnStatus.Learning,
    [Status.Known]: LearnStatus.Known,
    [Status.Mastered]: LearnStatus.Mastered,
  }

  static toLearn(status: Status): LearnStatus {
    return StatusMap.LEARN_STATUS[status]
  }
}
