import { describe, expect, it } from 'vitest'
import { AdaptivePlacementEngine, PlacementConfig, SyntheticWords } from '../../index'

const TOTAL = 10000
const SEED_COUNT = 30
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => i + 1)
const HASH_SALT = 100003
const OVERCLAIM_RATE = 0.5

const words = SyntheticWords.generate(TOTAL)
const rankByKey = new Map(words.map(w => [w.id, w.rank]))

const seeded = (seed: number) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Learner = { knowsReal: (rank: number, seed: number) => boolean; claimsPseudo: (rng: () => number) => boolean }
type Outcome = { level: number; percent: number; probes: number }

const wordLuck = (seed: number, rank: number) => seeded(seed * HASH_SALT + rank)()
const never = () => false
const honest = (knowsReal: Learner['knowsReal']): Learner => ({ knowsReal, claimsPseudo: never })
const fraction = (p: number) => honest((rank, seed) => wordLuck(seed, rank) < p)

const PROFILES: Record<string, Learner> = {
  upTo800: honest(rank => rank <= 800),
  upTo1700: honest(rank => rank <= 1700),
  eighty: fraction(0.8),
  sixty: fraction(0.6),
  plateau: honest((rank, seed) => wordLuck(seed, rank) < (rank <= 800 ? 0.95 : 0.3)),
  nothing: honest(() => false),
  everything: honest(() => true),
  eightyOverclaim: { ...fraction(0.8), claimsPseudo: (rng: () => number) => rng() < OVERCLAIM_RATE },
}

const play = (learner: Learner, seed: number): Outcome => {
  const engine = new AdaptivePlacementEngine()
  const claimRng = seeded(seed + HASH_SALT)
  let state = engine.start(words, seeded(seed))
  while (!engine.isFinished(state)) {
    const probe = engine.nextProbe(state)
    const answers = probe.items.map(i => ({
      key: i.key,
      known: i.pseudo ? learner.claimsPseudo(claimRng) : learner.knowsReal(rankByKey.get(i.key) as number, seed),
    }))
    state = engine.record(state, probe, answers)
  }
  const estimate = engine.estimate(state)
  return { level: estimate.estimatedRank, percent: estimate.percentKnown, probes: state.probes.length }
}

const simulate = (learner: Learner): Outcome[] => SEEDS.map(seed => play(learner, seed))
const share = (rows: Outcome[], test: (o: Outcome) => boolean) => rows.filter(test).length / rows.length
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
const summary = (xs: number[]) => `${Math.min(...xs)}..${Math.max(...xs)} (mean ${Math.round(mean(xs))})`

describe('placement simulation (30 deterministic seeds per profile)', () => {
  const results = Object.fromEntries(Object.entries(PROFILES).map(([name, l]) => [name, simulate(l)]))

  it('prints the profile table', () => {
    const table = Object.entries(results).map(([name, rows]) => ({
      profile: name, level: summary(rows.map(r => r.level)), percent: summary(rows.map(r => r.percent)),
      probes: summary(rows.map(r => r.probes)),
    }))
    console.table(table)
    expect(table).toHaveLength(Object.keys(PROFILES).length)
  })

  it('a: knows exactly ranks <= 800 -> level 800 +-150 and 6-10 percent of the 10,000-word map', () => {
    const rows = results.upTo800
    expect(share(rows, r => Math.abs(r.level - 800) <= 150)).toBeGreaterThanOrEqual(0.95)
    expect(share(rows, r => r.percent >= 6 && r.percent <= 10)).toBeGreaterThanOrEqual(0.95)
  })

  it('a2: knows exactly ranks <= 1700 (the owner profile) -> level 1700 +-150 and 15-19 percent', () => {
    const rows = results.upTo1700
    expect(share(rows, r => Math.abs(r.level - 1700) <= 150)).toBeGreaterThanOrEqual(0.95)
    expect(share(rows, r => r.percent >= 15 && r.percent <= 19)).toBeGreaterThanOrEqual(0.95)
  })

  it('b: 80 percent of every band -> about 80 percent known, level bounds relaxed at 100 bands', () => {
    const rows = results.eighty
    expect(share(rows, r => r.level <= 1500)).toBeGreaterThanOrEqual(0.6)
    expect(share(rows, r => r.level <= 2000)).toBeGreaterThanOrEqual(0.65)
    expect(share(rows, r => r.percent >= 65 && r.percent <= 95)).toBeGreaterThanOrEqual(0.7)
    expect(share(rows, r => r.percent >= 70 && r.percent <= 90)).toBeGreaterThanOrEqual(0.5)
    expect(mean(rows.map(r => r.percent))).toBeGreaterThanOrEqual(70)
    expect(mean(rows.map(r => r.percent))).toBeLessThanOrEqual(85)
  })

  it('c: 60 percent of every band -> about 60 percent known, level under 800', () => {
    const rows = results.sixty
    expect(share(rows, r => r.level <= 800)).toBeGreaterThanOrEqual(0.95)
    expect(share(rows, r => r.percent >= 45 && r.percent <= 75)).toBeGreaterThanOrEqual(0.6)
    expect(share(rows, r => r.percent >= 50 && r.percent <= 70)).toBeGreaterThanOrEqual(0.5)
    expect(mean(rows.map(r => r.percent))).toBeGreaterThanOrEqual(46)
    expect(mean(rows.map(r => r.percent))).toBeLessThanOrEqual(68)
  })

  it('d: 95 percent up to rank 800 then 30 percent -> level near 800', () => {
    const rows = results.plateau
    expect(share(rows, r => r.level >= 600 && r.level <= 1000)).toBeGreaterThanOrEqual(0.7)
    expect(share(rows, r => r.level >= 400 && r.level <= 1000)).toBeGreaterThanOrEqual(0.8)
  })

  it('e: knows nothing -> level 0 and 0 percent', () => {
    expect(results.nothing.every(r => r.level === 0 && r.percent === 0)).toBe(true)
  })

  it('f: knows every real word without false alarms -> top level, at least 95 percent', () => {
    expect(results.everything.every(r => r.level >= TOTAL - PlacementConfig.BAND_SIZE && r.percent >= 95)).toBe(true)
  })

  it('g: an over-claimer who says known to half of the pseudowords is estimated lower than with the same real answers and no false alarms', () => {
    const honestRows = results.eighty
    const claimRows = results.eightyOverclaim
    expect(mean(claimRows.map(r => r.percent))).toBeLessThan(mean(honestRows.map(r => r.percent)))
    const lower = SEEDS.filter((_, i) => claimRows[i].percent < honestRows[i].percent || claimRows[i].level < honestRows[i].level)
    expect(lower.length / SEED_COUNT).toBeGreaterThanOrEqual(0.7)
  })

  it('every run uses 4 to MAX_PROBES probes', () => {
    for (const rows of Object.values(results)) {
      expect(rows.every(r => r.probes >= 4 && r.probes <= PlacementConfig.MAX_PROBES)).toBe(true)
    }
  })
})
