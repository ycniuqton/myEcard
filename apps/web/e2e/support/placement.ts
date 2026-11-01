import { expect, type Page } from '@playwright/test'

export const PlacementId = {
  Card: 'probe-card',
  Word: 'probe-word',
  Know: 'probe-know',
  DontKnow: 'probe-dont-know',
  FinishNow: 'placement-finish-now',
  Dots: 'placement-dots',
  Result: 'placement-result',
  Level: 'placement-level',
  Percent: 'placement-percent',
  Marked: 'placement-marked',
  Slider: 'placement-slider',
  Accept: 'placement-accept',
  Retake: 'placement-retake',
} as const

export const ITEMS_PER_PROBE = 7
export const MIN_PROBES_TO_FINISH = 3
export const LEVEL_TOLERANCE = 250
const MAX_ITEMS = 70
const PEEK_TIMEOUT_MS = 500

/** What a simulated learner answers for a shown word; rank is undefined for made-up words. */
export type Learner = (shown: { rank: number | undefined; realSeenInProbe: number }) => boolean

/** Learner who knows every real word up to a rank and rejects made-up words. */
export class Learners {
  static upTo(level: number): Learner {
    return ({ rank }) => rank !== undefined && rank <= level
  }

  static partialUpTo(level: number, forgetsEvery: number): Learner {
    return ({ rank }) => rank !== undefined && rank <= level && rank % forgetsEvery !== 0
  }

  static partialOverClaimer(level: number, forgetsEvery: number): Learner {
    return ({ rank }) => rank === undefined || (rank <= level && rank % forgetsEvery !== 0)
  }

  static knowsEverything(): Learner {
    return () => true
  }
}

/** Drives the probe screen like a person: reads the shown word, answers, waits for the next item or the result. */
export class PlacementDriver {
  private answered = 0
  private realSeen = 0

  constructor(
    private readonly page: Page,
    private readonly ranks: Map<string, number>,
  ) {}

  private id(testId: string) {
    return this.page.getByTestId(testId)
  }

  async answerItem(learner: Learner): Promise<void> {
    const text = ((await this.id(PlacementId.Word).textContent()) ?? '').trim()
    if (this.answered % ITEMS_PER_PROBE === 0) this.realSeen = 0
    const rank = this.ranks.get(text)
    const known = learner({ rank, realSeenInProbe: this.realSeen })
    if (rank !== undefined) this.realSeen += 1
    this.answered += 1
    await this.id(known ? PlacementId.Know : PlacementId.DontKnow).click()
    await this.settle(text)
  }

  async answerProbes(learner: Learner, probes: number): Promise<void> {
    for (let i = 0; i < probes * ITEMS_PER_PROBE; i++) await this.answerItem(learner)
  }

  async playToResult(learner: Learner): Promise<void> {
    for (let i = 0; i < MAX_ITEMS && !(await this.id(PlacementId.Result).isVisible()); i++) await this.answerItem(learner)
    await expect(this.id(PlacementId.Result)).toBeVisible()
  }

  async level(): Promise<number> {
    return Number(((await this.id(PlacementId.Level).textContent()) ?? '').replace(/\D/g, ''))
  }

  async marked(): Promise<number> {
    return Number(((await this.id(PlacementId.Marked).textContent()) ?? '').replace(/\D/g, ''))
  }

  private async settle(previous: string): Promise<void> {
    await expect
      .poll(async () => {
        if (await this.id(PlacementId.Result).isVisible()) return true
        const next = await this.id(PlacementId.Word).textContent({ timeout: PEEK_TIMEOUT_MS }).catch(() => null)
        return next !== null && next.trim() !== previous
      })
      .toBe(true)
  }
}
