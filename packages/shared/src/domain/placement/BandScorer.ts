import { PlacementConfig } from './PlacementConfig'

/** Converts raw probe hits and pseudoword false alarms into corrected band scores. */
export class BandScorer {
  falseAlarmRate(pseudoShown: number, falseAlarms: number): number {
    if (pseudoShown < PlacementConfig.MIN_PSEUDO_FOR_RATE) return 0
    return Math.min(PlacementConfig.MAX_FALSE_ALARM_RATE, falseAlarms / pseudoShown)
  }

  score(hits: number, shown: number, falseAlarmRate: number): number {
    if (shown === 0) return 0
    const corrected = (hits / shown - falseAlarmRate) / (1 - falseAlarmRate)
    return Math.min(1, Math.max(0, corrected))
  }

  knowsBand(score: number): boolean {
    return score >= PlacementConfig.BISECT_THRESHOLD
  }
}
