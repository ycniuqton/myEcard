import { BandScorer } from './BandScorer'
import { KnowledgeCurve } from './KnowledgeCurve'
import { PlacementConfig } from './PlacementConfig'
import type { PlacementEstimate, PlacementState } from './PlacementTypes'

/** Turns probe records into a knowledge curve, the share of the map known and the assumed-known level; the level never exceeds the highest probed band. */
export class PlacementEstimator {
  constructor(private readonly scorer = new BandScorer()) {}

  estimate(state: PlacementState): PlacementEstimate {
    const f = this.scorer.falseAlarmRate(state.pseudoShown, state.falseAlarms)
    const curve = this.curve(state, f)
    const sizes = new Map([...state.bands].map(([band, list]) => [band, list.length] as [number, number]))
    const total = [...sizes.values()].reduce((a, b) => a + b, 0)
    const expectedKnown = curve.expectedKnown(sizes)
    const percentKnown = total === 0 ? 0 : Math.round((expectedKnown / total) * PlacementConfig.PERCENT)
    return { estimatedRank: this.level(curve, state), percentKnown, falseAlarmRate: f, expectedKnown }
  }

  curve(state: PlacementState, falseAlarmRate: number): KnowledgeCurve {
    return KnowledgeCurve.fit(state.probes.map(p => ({
      band: p.band, value: this.scorer.score(p.hits, p.realShown, falseAlarmRate), weight: p.realShown,
    })))
  }

  private probedRange(state: PlacementState): number[] {
    const highest = Math.max(0, ...state.probes.map(p => p.band))
    return [...state.bands.keys()].filter(band => band <= highest)
  }

  private level(curve: KnowledgeCurve, state: PlacementState): number {
    const top = curve.confidentBand(this.probedRange(state))
    const raw = top * PlacementConfig.BAND_SIZE
    const stepped = Math.round(raw / PlacementConfig.SLIDER_STEP) * PlacementConfig.SLIDER_STEP
    return Math.min(state.maxRank, stepped)
  }
}
