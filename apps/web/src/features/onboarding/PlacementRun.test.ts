import { describe, expect, it } from 'vitest'
import { PlacementConfig, PseudowordBank, type ProbeItem, type Word } from '@wordmap/shared'
import { PlacementRun } from './PlacementRun'

const WORD_COUNT = 2000
const LEARNER_RANK = 800
const TOLERANCE = 250
const SEED = 7
const SAFETY_LIMIT = 200
const PARTIAL_MOD = 4
const EXPECTED_PERCENT = 40
const PERCENT_TOLERANCE = 5
const ITEMS_PER_PROBE = 7

function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function words(): Word[] {
  return Array.from({ length: WORD_COUNT }, (_, i) => ({
    id: `w${i + 1}`, lemma: `word${i + 1}`, rank: i + 1, band: Math.ceil((i + 1) / PlacementConfig.BAND_SIZE),
  }) as unknown as Word)
}

function rankOf(item: ProbeItem): number {
  return Number((item.wordId ?? '').slice(1))
}

function play(run: PlacementRun, knows: (item: ProbeItem) => boolean): number {
  let shown = 0
  while (!run.finished && shown < SAFETY_LIMIT) {
    run.answer(knows(run.current as ProbeItem))
    shown += 1
  }
  return shown
}

const learner = (item: ProbeItem) => !item.pseudo && rankOf(item) <= LEARNER_RANK

describe('PlacementRun', () => {
  it('shows seven items per probe, six real words and one pseudoword', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    const seen: ProbeItem[] = []
    for (let i = 0; i < run.itemCount; i++) {
      seen.push(run.current as ProbeItem)
      run.answer(true)
    }
    expect(seen).toHaveLength(ITEMS_PER_PROBE)
    expect(seen).toHaveLength(PlacementConfig.REAL_PER_PROBE + PlacementConfig.PSEUDO_PER_PROBE)
    expect(seen.filter(i => i.pseudo)).toHaveLength(PlacementConfig.PSEUDO_PER_PROBE)
    expect(seen.filter(i => i.pseudo).every(i => PseudowordBank.contains(i.text))).toBe(true)
    expect(run.probesDone).toBe(1)
  })

  it('tracks item position inside a probe', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    expect(run.itemNumber).toBe(1)
    run.answer(false)
    expect(run.itemNumber).toBe(2)
    expect(run.probesDone).toBe(0)
  })

  it('finds a learner near rank 800 within tolerance', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    play(run, learner)
    expect(run.finished).toBe(true)
    expect(run.probesDone).toBeLessThanOrEqual(PlacementConfig.MAX_PROBES)
    expect(Math.abs(run.estimate.estimatedRank - LEARNER_RANK)).toBeLessThanOrEqual(TOLERANCE)
  })

  it('lowers the estimate for a learner who claims pseudowords with the same real answers', () => {
    const partial = (item: ProbeItem) => !item.pseudo && rankOf(item) <= LEARNER_RANK && rankOf(item) % PARTIAL_MOD !== 0
    const honest = new PlacementRun(words(), mulberry(SEED))
    play(honest, partial)
    const claimer = new PlacementRun(words(), mulberry(SEED))
    play(claimer, item => item.pseudo || partial(item))
    expect(claimer.estimate.falseAlarmRate).toBeGreaterThan(0)
    expect(claimer.estimate.percentKnown).toBeLessThan(honest.estimate.percentKnown)
  })

  it('allows finishing early only after the minimum number of probes', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    for (let p = 0; p < PlacementConfig.MIN_PROBES_TO_FINISH; p++) {
      expect(run.canFinishNow).toBe(false)
      run.finishNow()
      expect(run.finished).toBe(false)
      for (let i = 0; i < run.itemCount; i++) run.answer(true)
      if (run.finished) return
    }
    expect(run.canFinishNow).toBe(true)
    run.finishNow()
    expect(run.finished).toBe(true)
    expect(run.current).toBeNull()
  })

  it('builds a submission with tapped ids and the chosen level', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    play(run, learner)
    const sub = run.submission(LEARNER_RANK)
    expect(sub.level).toBe(LEARNER_RANK)
    expect(sub.probes).toHaveLength(run.probesDone)
    expect(sub.tappedKnownIds.length).toBeGreaterThan(0)
    const ids = run.knownIdsFor(LEARNER_RANK)
    expect(ids).toHaveLength(new Set(ids).size)
    expect(sub.tappedKnownIds.every(id => ids.includes(id))).toBe(true)
  })

  it('previews fewer known words for a lower level', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    play(run, learner)
    expect(run.knownIdsFor(LEARNER_RANK).length).toBeGreaterThan(run.knownIdsFor(PlacementConfig.SLIDER_STEP).length)
  })

  it('previews percent of the map and words marked known for a level', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    play(run, learner)
    const preview = run.preview(LEARNER_RANK)
    expect(preview.percent).toBe(run.estimate.percentKnown)
    expect(Math.abs(preview.percent - EXPECTED_PERCENT)).toBeLessThanOrEqual(PERCENT_TOLERANCE)
    expect(preview.knownCount).toBe(run.knownIdsFor(LEARNER_RANK).length)
    expect(run.preview(0).knownCount).toBe(run.knownIdsFor(0).length)
  })

  it('finishes at once for an empty word list', () => {
    const run = new PlacementRun([], mulberry(SEED))
    expect(run.finished).toBe(true)
    expect(run.current).toBeNull()
  })

  it('ignores answers after the run finished', () => {
    const run = new PlacementRun(words(), mulberry(SEED))
    play(run, learner)
    const done = run.probesDone
    run.answer(true)
    expect(run.probesDone).toBe(done)
  })
})


