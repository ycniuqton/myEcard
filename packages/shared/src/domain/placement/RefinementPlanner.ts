import { PlacementConfig } from './PlacementConfig'

/** Picks the unprobed bands just above and below the bisection frontier for the refinement probes. */
export class RefinementPlanner {
  plan(frontier: number, probed: number[], topBand: number): number[] {
    const taken = new Set(probed)
    const picks: number[] = []
    for (const band of this.candidates(frontier, topBand)) {
      if (picks.length >= PlacementConfig.REFINE_PROBES) break
      if (this.isFree(band, taken, topBand)) picks.push(band)
    }
    return picks
  }

  private candidates(frontier: number, topBand: number): number[] {
    const out: number[] = []
    for (let k = 1; k <= topBand; k++) {
      out.push(frontier + k * PlacementConfig.REFINE_STEP, frontier - k * PlacementConfig.REFINE_STEP)
    }
    return out
  }

  private isFree(band: number, taken: Set<number>, topBand: number): boolean {
    return band >= PlacementConfig.FIRST_BAND && band <= topBand && !taken.has(band)
  }
}
