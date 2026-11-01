import type { BandAnswer, Word } from '../../dto'
import type { Rng } from '../scheduling/SchedulingStrategy'
import type { StopReason } from './PlacementConfig'

/** The slice of a Word the placement engine needs; a full Word is assignable. */
export type PlacementWord = Pick<Word, 'id' | 'lemma' | 'rank' | 'band'>

export type ProbeItem = { key: string; text: string; wordId: string | null; pseudo: boolean }
export type Probe = { band: number; items: ProbeItem[] }
export type ProbeAnswer = { key: string; known: boolean }
export type ProbeRecord = { band: number; hits: number; realShown: number; answers: BandAnswer[] }

/** Live search state. Holds the rng and word bands, so it is not JSON-serialisable. */
export type PlacementState = {
  lo: number
  hi: number
  probes: ProbeRecord[]
  falseAlarms: number
  pseudoShown: number
  usedPseudo: string[]
  stop: StopReason | null
  maxRank: number
  topBand: number
  refine: number[] | null
  bands: Map<number, PlacementWord[]>
  rng: Rng
}

export type PlacementEstimate = {
  estimatedRank: number
  percentKnown: number
  falseAlarmRate: number
  expectedKnown: number
}
