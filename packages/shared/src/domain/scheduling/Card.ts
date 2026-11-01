import { Status } from '../../enums'
import type { UserWord } from '../../dto'
import { DateUtil } from '../dates'
import { SchedulingConfig } from './SchedulingConfig'

export type Card = Pick<UserWord, 'ease' | 'interval' | 'reps' | 'lapses' | 'due' | 'status' | 'assumed'>

/** Factory for the starting card of each word origin. */
export class CardFactory {
  static fresh(): Card {
    return {
      ease: SchedulingConfig.START_EASE, interval: 0, reps: 0, lapses: 0,
      due: null, status: Status.Unknown, assumed: false,
    }
  }

  static learning(now: Date): Card {
    return { ...CardFactory.fresh(), status: Status.Learning, due: DateUtil.iso(now) }
  }

  static assumedKnown(now: Date): Card {
    return {
      ease: SchedulingConfig.START_EASE,
      interval: SchedulingConfig.ASSUMED_CHECK_DAYS,
      reps: SchedulingConfig.ASSUMED_REPS,
      lapses: 0,
      due: DateUtil.addDays(DateUtil.iso(now), SchedulingConfig.ASSUMED_CHECK_DAYS),
      status: Status.Known,
      assumed: true,
    }
  }
}

export const newCard = (): Card => CardFactory.fresh()
export const learningCard = (now: Date): Card => CardFactory.learning(now)
export const assumedKnownCard = (now: Date): Card => CardFactory.assumedKnown(now)
