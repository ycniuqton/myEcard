import type { BandAnswer, PlacementSubmission } from '../../dto'
import type { Rng } from '../scheduling/SchedulingStrategy'
import { BandScorer } from './BandScorer'
import { PlacementConfig, StopReason } from './PlacementConfig'
import { PlacementEstimator } from './PlacementEstimator'
import type { PlacementEstimate, PlacementState, PlacementWord, Probe, ProbeAnswer, ProbeItem, ProbeRecord } from './PlacementTypes'
import { ProbeBuilder } from './ProbeBuilder'
import { RefinementPlanner } from './RefinementPlanner'

/** Bisection plus refinement probes over word bands, fitted to a monotone knowledge curve; deterministic per rng. */
export class AdaptivePlacementEngine {
  static readonly shared = new AdaptivePlacementEngine()

  constructor(
    private readonly scorer = new BandScorer(),
    private readonly builder = new ProbeBuilder(),
    private readonly estimator = new PlacementEstimator(scorer),
    private readonly planner = new RefinementPlanner(),
  ) {}

  start(words: PlacementWord[], rng: Rng = Math.random): PlacementState {
    const bands = new Map<number, PlacementWord[]>()
    for (const w of words) this.addToBand(bands, w)
    const top = Math.max(PlacementConfig.FIRST_BAND, ...bands.keys())
    const maxRank = words.reduce((m, w) => Math.max(m, w.rank), 0)
    return {
      lo: PlacementConfig.FIRST_BAND, hi: top, probes: [], falseAlarms: 0, pseudoShown: 0,
      usedPseudo: [], stop: null, maxRank, topBand: top, refine: null, bands, rng,
    }
  }

  private addToBand(bands: Map<number, PlacementWord[]>, word: PlacementWord): void {
    const list = bands.get(word.band) ?? []
    list.push(word)
    bands.set(word.band, list)
  }

  nextProbe(state: PlacementState): Probe {
    if (this.isFinished(state)) throw new Error(PlacementConfig.NO_PROBE_MESSAGE)
    const band = this.nextBand(state)
    return this.builder.build(band, state.bands.get(band) ?? [], state.usedPseudo, state.rng)
  }

  record(state: PlacementState, probe: Probe, answers: ProbeAnswer[]): PlacementState {
    const known = new Set(answers.filter(a => a.known).map(a => a.key))
    const real = probe.items.filter(i => !i.pseudo)
    const pseudo = probe.items.filter(i => i.pseudo)
    const next: PlacementState = {
      ...state,
      probes: [...state.probes, this.toRecord(probe.band, real, known)],
      falseAlarms: state.falseAlarms + pseudo.filter(i => known.has(i.key)).length,
      pseudoShown: state.pseudoShown + pseudo.length,
      usedPseudo: [...state.usedPseudo, ...pseudo.map(i => i.text)],
    }
    return this.advance(next, probe.band)
  }

  isFinished(state: PlacementState): boolean {
    return state.stop !== null || state.probes.length >= PlacementConfig.MAX_PROBES
  }

  canFinishNow(state: PlacementState): boolean {
    return state.probes.length >= PlacementConfig.MIN_PROBES_TO_FINISH
  }

  estimate(state: PlacementState): PlacementEstimate {
    return this.estimator.estimate(state)
  }

  knownIdsForLevel(words: PlacementWord[], level: number, tappedKnownIds: string[]): string[] {
    const cutoff = Math.max(0, level - PlacementConfig.ASSUMED_MARGIN)
    const ids = new Set(words.filter(w => w.rank <= cutoff).map(w => w.id))
    tappedKnownIds.forEach(id => ids.add(id))
    return [...ids]
  }

  tappedKnownIds(state: PlacementState): string[] {
    return state.probes.flatMap(p => p.answers.filter(a => a.known).map(a => a.wordId))
  }

  submission(state: PlacementState, level: number): PlacementSubmission {
    const probes = state.probes.map(p => ({ band: p.band, answers: p.answers }))
    return { level, tappedKnownIds: this.tappedKnownIds(state), probes }
  }

  private nextBand(state: PlacementState): number {
    if (state.refine !== null) return state.refine[0]
    if (state.probes.length === 0) return Math.min(state.hi, Math.max(state.lo, PlacementConfig.START_BAND))
    return Math.floor((state.lo + state.hi) / 2)
  }

  private toRecord(band: number, real: ProbeItem[], known: Set<string>): ProbeRecord {
    const answers: BandAnswer[] = real.map(i => ({ wordId: i.wordId as string, known: known.has(i.key) }))
    return { band, hits: answers.filter(a => a.known).length, realShown: real.length, answers }
  }

  private advance(state: PlacementState, band: number): PlacementState {
    if (state.refine !== null) return this.afterRefine(state, state.refine.slice(1))
    return this.afterBisect(state, band)
  }

  private afterRefine(state: PlacementState, rest: number[]): PlacementState {
    if (rest.length === 0) return { ...state, refine: rest, stop: StopReason.Refined }
    return this.capped({ ...state, refine: rest })
  }

  private afterBisect(state: PlacementState, band: number): PlacementState {
    const last = state.probes[state.probes.length - 1]
    const f = this.scorer.falseAlarmRate(state.pseudoShown, state.falseAlarms)
    const knows = this.scorer.knowsBand(this.scorer.score(last.hits, last.realShown, f))
    const moved = knows ? { ...state, lo: band + 1 } : { ...state, hi: band - 1 }
    if (moved.lo <= moved.hi) return this.capped(moved)
    return this.startRefine(moved)
  }

  private startRefine(state: PlacementState): PlacementState {
    const plan = this.planner.plan(state.lo - 1, state.probes.map(p => p.band), state.topBand)
    if (plan.length === 0) return { ...state, refine: plan, stop: StopReason.Exhausted }
    return this.capped({ ...state, refine: plan })
  }

  private capped(state: PlacementState): PlacementState {
    if (state.probes.length >= PlacementConfig.MAX_PROBES) return { ...state, stop: StopReason.MaxProbes }
    return state
  }
}
