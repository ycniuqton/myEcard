import { describe, expect, it } from 'vitest'
import {
  AdaptivePlacementEngine, AssumedSchedule, PlacementConfig, PseudowordBank, StopReason, assumedDue,
  SyntheticWords, type PlacementState, type Probe, type ProbeAnswer,
} from '../../index'
import { DateUtil } from '../dates'

const TOTAL = 10000
const SEEDS = [1, 2, 3, 4, 5]
const BANDS = Array.from({ length: SyntheticWords.bandCount(TOTAL) }, (_, i) => i + 1)
const TOP_BAND = BANDS.length

const words = SyntheticWords.generate(TOTAL)

const seeded = (seed: number) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rankOf = (key: string) => Number(key.slice(key.lastIndexOf(':') + 1))

type Learner = (key: string, pseudo: boolean) => boolean

const knowsUpTo = (R: number): Learner => (key, pseudo) => !pseudo && rankOf(key) <= R

const noisy = (R: number, flip: number, rng: () => number): Learner => (key, pseudo) => {
  const truth = !pseudo && rankOf(key) <= R
  return rng() < flip ? !truth : truth
}

const answerAll = (probe: Probe, learner: Learner): ProbeAnswer[] =>
  probe.items.map(i => ({ key: i.key, known: learner(i.key, i.pseudo) }))

const run = (learner: Learner, seed: number) => {
  const engine = new AdaptivePlacementEngine()
  let state = engine.start(words, seeded(seed))
  const bands: number[] = []
  while (!engine.isFinished(state)) {
    const probe = engine.nextProbe(state)
    bands.push(probe.band)
    state = engine.record(state, probe, answerAll(probe, learner))
  }
  return { engine, state, bands, estimate: engine.estimate(state) }
}

const answerFor = (probe: Probe, realKnown: number, pseudoKnown: boolean): ProbeAnswer[] => {
  let seen = 0
  return probe.items.map(i => {
    if (i.pseudo) return { key: i.key, known: pseudoKnown }
    seen += 1
    return { key: i.key, known: seen <= realKnown }
  })
}

describe('PseudowordBank', () => {
  it('holds about 80 unique pronounceable lowercase non-words of 4-9 letters', () => {
    const bank = PseudowordBank.all()
    expect(bank.length).toBeGreaterThanOrEqual(80)
    expect(new Set(bank).size).toBe(bank.length)
    expect(bank.every(w => /^[a-z]{4,9}$/.test(w))).toBe(true)
    expect(PseudowordBank.contains(bank[0])).toBe(true)
    expect(PseudowordBank.contains('the')).toBe(false)
  })
})

describe('probe composition', () => {
  it('shows 6 real words of the band plus 1 unused pseudoword, shuffled', () => {
    const engine = new AdaptivePlacementEngine()
    let state = engine.start(words, seeded(7))
    const used = new Set<string>()
    for (let n = 0; n < 4; n++) {
      const probe = engine.nextProbe(state)
      const real = probe.items.filter(i => !i.pseudo)
      const pseudo = probe.items.filter(i => i.pseudo)
      expect(real).toHaveLength(6)
      expect(pseudo).toHaveLength(1)
      expect(real.every(i => words.find(w => w.id === i.wordId)?.band === probe.band)).toBe(true)
      expect(used.has(pseudo[0].text)).toBe(false)
      used.add(pseudo[0].text)
      state = engine.record(state, probe, answerFor(probe, 6, false))
    }
  })

  it('is deterministic for the same seed and varies with another', () => {
    const engine = new AdaptivePlacementEngine()
    const keys = (seed: number) => engine.nextProbe(engine.start(words, seeded(seed))).items.map(i => i.key)
    expect(keys(3)).toEqual(keys(3))
    expect(keys(3)).not.toEqual(keys(4))
  })

  it('places the pseudoword at different positions across seeds', () => {
    const engine = new AdaptivePlacementEngine()
    const spots = new Set(SEEDS.concat([6, 7, 8, 9]).map(s =>
      engine.nextProbe(engine.start(words, seeded(s))).items.findIndex(i => i.pseudo)))
    expect(spots.size).toBeGreaterThan(1)
  })
})

describe('bisection path', () => {
  it('simulated learner at rank 800 bisects 20, 10, 5, 7, 8, 9, refines at 6 and 12, and estimates 800', () => {
    const { bands, estimate, state } = run(knowsUpTo(800), 1)
    expect(bands).toEqual([20, 10, 5, 7, 8, 9, 6, 12])
    expect(state.stop).toBe(StopReason.Refined)
    expect(estimate.estimatedRank).toBe(800)
    expect(estimate.percentKnown).toBe(8)
  })

  it('learner at rank 0 walks down to band 1 and estimates 0', () => {
    const { bands, estimate } = run(knowsUpTo(0), 1)
    expect(bands).toEqual([20, 10, 5, 2, 1, 4, 6])
    expect(estimate).toMatchObject({ estimatedRank: 0, percentKnown: 0 })
  })

  it('learner at the top rank walks up to the last band and estimates the full map', () => {
    const { bands, estimate } = run(knowsUpTo(TOTAL), 1)
    expect(bands).toEqual([20, 60, 80, 90, 95, 98, 99, TOP_BAND, 96, 94])
    expect(bands).toContain(TOP_BAND)
    expect(estimate).toMatchObject({ estimatedRank: TOTAL, percentKnown: 100 })
  })

  it('noisy answers still finish within the probe cap and land near the true level', () => {
    const errors = SEEDS.map(seed => {
      const { state, estimate } = run(noisy(1200, 0.05, seeded(seed + 100)), seed)
      expect(state.probes.length).toBeLessThanOrEqual(PlacementConfig.MAX_PROBES)
      return Math.abs(estimate.estimatedRank - 1200)
    })
    expect(Math.max(...errors)).toBeLessThanOrEqual(800)
    expect(errors.reduce((a, b) => a + b, 0) / errors.length).toBeLessThanOrEqual(400)
  })
})

describe('false-alarm correction', () => {
  const twoProbes = (pseudoKnownOnSecond: boolean) => {
    const engine = new AdaptivePlacementEngine()
    let state = engine.start(words, seeded(11))
    const first = engine.nextProbe(state)
    state = engine.record(state, first, answerFor(first, 4, false))
    const second = engine.nextProbe(state)
    state = engine.record(state, second, answerFor(second, 4, pseudoKnownOnSecond))
    return engine.estimate(state)
  }

  it('an over-claimer gets a lower estimate than an honest learner with the same real answers', () => {
    const honest = twoProbes(false)
    const overclaimer = twoProbes(true)
    expect(honest.falseAlarmRate).toBe(0)
    expect(overclaimer.falseAlarmRate).toBe(0.5)
    expect(overclaimer.percentKnown).toBeLessThan(honest.percentKnown)
    expect(overclaimer.expectedKnown).toBeLessThan(honest.expectedKnown)
  })

  it('uses f = 0 with fewer than 2 pseudowords and caps f at 0.8', () => {
    const engine = new AdaptivePlacementEngine()
    let state = engine.start(words, seeded(12))
    const first = engine.nextProbe(state)
    state = engine.record(state, first, answerFor(first, 3, true))
    expect(engine.estimate(state).falseAlarmRate).toBe(0)
    const { estimate } = run(() => true, 5)
    expect(estimate.falseAlarmRate).toBe(PlacementConfig.MAX_FALSE_ALARM_RATE)
  })

  it('clamps the corrected band score to 0..1', () => {
    const { estimate } = run((k, pseudo) => pseudo, 2)
    expect(estimate).toMatchObject({ estimatedRank: 0, percentKnown: 0 })
  })
})

describe('stop rules', () => {
  it('refines with two probes after the bisection and then stops', () => {
    const { state, engine, bands } = run(knowsUpTo(800), 21)
    expect(state.stop).toBe(StopReason.Refined)
    expect(bands.slice(-PlacementConfig.REFINE_PROBES)).toEqual([6, 12])
    expect(engine.isFinished(state)).toBe(true)
    expect(() => engine.nextProbe(state)).toThrow()
  })

  it('keeps every learner within the probe cap', () => {
    for (const R of [0, 300, 800, 1250, 2000, TOTAL]) {
      const { state } = run(knowsUpTo(R), 4)
      expect(state.probes.length).toBeGreaterThanOrEqual(PlacementConfig.MIN_PROBES_TO_FINISH)
      expect(state.probes.length).toBeLessThanOrEqual(PlacementConfig.MAX_PROBES)
    }
  })

  it('stops when lo exceeds hi', () => {
    const { state, engine } = run(knowsUpTo(0), 3)
    expect(state.lo).toBeGreaterThan(state.hi)
    expect(engine.isFinished(state)).toBe(true)
  })

  it('stops at the probe cap', () => {
    const engine = new AdaptivePlacementEngine()
    const base = engine.start(words, seeded(22))
    const filler = { band: 1, hits: 6, realShown: 6, answers: [] }
    const almostDone: PlacementState = { ...base, probes: Array.from({ length: PlacementConfig.MAX_PROBES - 1 }, () => filler) }
    expect(engine.isFinished(almostDone)).toBe(false)
    const probe = engine.nextProbe(almostDone)
    const last = engine.record(almostDone, probe, answerFor(probe, 6, false))
    expect(last.stop).toBe(StopReason.MaxProbes)
    expect(engine.isFinished(last)).toBe(true)
    expect(engine.isFinished({ ...almostDone, probes: [...almostDone.probes, filler] })).toBe(true)
  })

  it('allows finishing now only after 3 probes', () => {
    const engine = new AdaptivePlacementEngine()
    let state = engine.start(words, seeded(23))
    const learner = knowsUpTo(1000)
    const flags: boolean[] = []
    for (let n = 0; n < 3; n++) {
      flags.push(engine.canFinishNow(state))
      const probe = engine.nextProbe(state)
      state = engine.record(state, probe, answerAll(probe, learner))
    }
    flags.push(engine.canFinishNow(state))
    expect(flags).toEqual([false, false, false, true])
  })
})

describe('knownIdsForLevel and submission', () => {
  const engine = new AdaptivePlacementEngine()

  it('marks ranks up to level minus the margin, plus tapped words, without duplicates', () => {
    const ids = engine.knownIdsForLevel(words, 800, [SyntheticWords.id(750), SyntheticWords.id(10)])
    expect(ids).toHaveLength(701)
    expect(ids).toContain(SyntheticWords.id(700))
    expect(ids).not.toContain(SyntheticWords.id(701))
    expect(ids).toContain(SyntheticWords.id(750))
  })

  it('handles level 0, small levels and the top level', () => {
    expect(engine.knownIdsForLevel(words, 0, [])).toEqual([])
    expect(engine.knownIdsForLevel(words, 100, [])).toEqual([])
    expect(engine.knownIdsForLevel(words, 50, [SyntheticWords.id(3)])).toEqual([SyntheticWords.id(3)])
    expect(engine.knownIdsForLevel(words, TOTAL, [])).toHaveLength(TOTAL - 100)
  })

  it('builds a submission with real answers only and the tapped ids', () => {
    let state = engine.start(words, seeded(31))
    const probe = engine.nextProbe(state)
    state = engine.record(state, probe, answerFor(probe, 2, true))
    const sub = engine.submission(state, 1500)
    expect(sub.level).toBe(1500)
    expect(sub.probes).toHaveLength(1)
    expect(sub.probes[0].answers).toHaveLength(PlacementConfig.REAL_PER_PROBE)
    expect(sub.probes[0].answers.every(a => words.some(w => w.id === a.wordId))).toBe(true)
    expect(sub.tappedKnownIds).toHaveLength(2)
  })
})

describe('assumedDue', () => {
  const today = '2026-03-10'

  it('spreads due dates between day 30 and day 59, deterministically', () => {
    const offsets = Array.from({ length: 200 }, (_, rank) => DateUtil.daysBetween(today, assumedDue(rank, today)))
    expect(Math.min(...offsets)).toBe(30)
    expect(Math.max(...offsets)).toBe(59)
    expect(new Set(offsets).size).toBe(30)
    expect(assumedDue(123, today)).toBe(assumedDue(123, today))
    expect(assumedDue(5, today)).toBe(assumedDue(35, today))
  })

  it('is today + 30 + rank mod 30', () => {
    expect(assumedDue(0, today)).toBe(DateUtil.addDays(today, 30))
    expect(AssumedSchedule.due(29, today)).toBe(DateUtil.addDays(today, 59))
  })
})

describe('simulated learners', () => {
  const levels = [0, 120, 400, 650, 800, 1250, 1900, 2500, TOTAL]

  it.each(levels)('a learner knowing ranks <= %i is estimated within +-200', R => {
    for (const seed of SEEDS) {
      const { estimate } = run(knowsUpTo(R), seed)
      expect(Math.abs(estimate.estimatedRank - R)).toBeLessThanOrEqual(200)
    }
  })

  it('never exceeds the probe cap and only probes valid bands', () => {
    for (const R of levels) {
      const { bands } = run(knowsUpTo(R), 9)
      expect(bands.length).toBeLessThanOrEqual(PlacementConfig.MAX_PROBES)
      expect(bands.every(b => BANDS.includes(b))).toBe(true)
    }
  })
})
