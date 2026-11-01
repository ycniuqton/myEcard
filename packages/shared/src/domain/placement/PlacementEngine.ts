import type { Word } from '../../dto'
import { PlacementConfig } from './PlacementConfig'

/** Placement helpers: band grouping and next new words (adaptive search is AdaptivePlacementEngine). */
export class PlacementEngine {
  static readonly BAND_SIZE = PlacementConfig.BAND_SIZE
  static readonly shared = new PlacementEngine()

  bandOf(rank: number): number {
    return Math.ceil(rank / PlacementEngine.BAND_SIZE)
  }

  groupByBand(words: Word[]): Map<number, Word[]> {
    const bands = new Map<number, Word[]>()
    for (const w of words) {
      const list = bands.get(w.band) ?? []
      list.push(w)
      bands.set(w.band, list)
    }
    return bands
  }

  nextNewWords(words: Word[], isUnknown: (id: string) => boolean, n: number): Word[] {
    return words
      .filter(w => isUnknown(w.id))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, n)
  }
}

export function bandOf(rank: number): number {
  return PlacementEngine.shared.bandOf(rank)
}
