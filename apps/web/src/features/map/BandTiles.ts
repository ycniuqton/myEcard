import type { Status } from '@wordmap/shared'
import type { BandSummary } from '../../store'
import type { LearnStatus } from '../../design/status'
import { StatusMap } from '../common/StatusMap'

export type BandPaint = {
  band: BandSummary
  statuses: LearnStatus[]
  hereIndex: number
  pops: ReadonlySet<number>
}

/** Builds the per-band tile paint (statuses, marker, pop indexes) from store progress. */
export class BandTiles {
  private static readonly NO_INDEX = -1

  static paint(
    band: BandSummary,
    statusByRank: readonly Status[],
    held: ReadonlyMap<number, Status>,
    popRanks: ReadonlySet<number>,
    markerRank: number | null,
  ): BandPaint {
    const statuses: LearnStatus[] = []
    const pops = new Set<number>()
    for (let rank = band.start; rank <= band.end; rank++) {
      statuses.push(StatusMap.toLearn(held.get(rank) ?? statusByRank[rank]))
      if (popRanks.has(rank)) pops.add(rank - band.start)
    }
    const hereIndex = markerRank !== null && band.here ? markerRank - band.start : BandTiles.NO_INDEX
    return { band, statuses, hereIndex, pops }
  }
}
