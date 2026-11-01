import {
  AdaptivePlacementEngine, PlacementConfig,
  type PlacementEstimate, type PlacementState, type PlacementSubmission, type Probe, type ProbeAnswer, type ProbeItem, type Word,
} from '@wordmap/shared'

export type Rng = () => number
export type PlacementPreview = { percent: number; knownCount: number }

/** One adaptive placement test in progress: shows probes item by item and hands the result to the result screen. */
export class PlacementRun {
  private state: PlacementState
  private probe: Probe | null = null
  private cursor = 0
  private answers: ProbeAnswer[] = []
  private ended = false

  constructor(
    private readonly words: Word[],
    rng: Rng = Math.random,
    private readonly engine: AdaptivePlacementEngine = AdaptivePlacementEngine.shared,
  ) {
    this.state = engine.start(words, rng)
    this.ended = words.length === 0
    if (!this.ended) this.probe = engine.nextProbe(this.state)
  }

  get current(): ProbeItem | null {
    return this.ended ? null : (this.probe?.items[this.cursor] ?? null)
  }

  get finished(): boolean {
    return this.ended
  }

  get probesDone(): number {
    return this.state.probes.length
  }

  get probeCount(): number {
    return PlacementConfig.MAX_PROBES
  }

  get itemNumber(): number {
    return this.cursor + 1
  }

  get itemCount(): number {
    return this.probe?.items.length ?? 0
  }

  get canFinishNow(): boolean {
    return !this.ended && this.engine.canFinishNow(this.state)
  }

  get wordCount(): number {
    return this.words.length
  }

  get estimate(): PlacementEstimate {
    return this.engine.estimate(this.state)
  }

  answer(known: boolean): void {
    const item = this.current
    if (!item || !this.probe) return
    this.answers.push({ key: item.key, known })
    this.cursor += 1
    if (this.cursor >= this.probe.items.length) this.closeProbe(this.probe)
  }

  finishNow(): void {
    if (this.canFinishNow) this.ended = true
  }

  preview(level: number): PlacementPreview {
    return { percent: this.estimate.percentKnown, knownCount: this.knownIdsFor(level).length }
  }

  knownIdsFor(level: number): string[] {
    return this.engine.knownIdsForLevel(this.words, level, this.engine.tappedKnownIds(this.state))
  }

  submission(level: number): PlacementSubmission {
    return this.engine.submission(this.state, level)
  }

  private closeProbe(probe: Probe): void {
    this.state = this.engine.record(this.state, probe, this.answers)
    this.answers = []
    this.cursor = 0
    this.ended = this.engine.isFinished(this.state)
    this.probe = this.ended ? null : this.engine.nextProbe(this.state)
  }
}

