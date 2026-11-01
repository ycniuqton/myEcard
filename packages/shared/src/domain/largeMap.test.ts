import { describe, expect, it } from 'vitest'
import { SessionPlanner, StatsCalculator, Status, SyntheticFormat, SyntheticWords, bandOf } from '../index'

const TOTAL = 10000
const STARTED = 5000
const BUDGET_MS = 50
const TODAY = '2026-03-10'
const DAILY_NEW = 5

const words = SyntheticWords.generate(TOTAL)
const userWords = SyntheticWords.userWords(words, STARTED)

const ATTEMPTS = 5

const timed = <T>(run: () => T): { value: T; ms: number } => {
  let best = Number.POSITIVE_INFINITY
  let value = run()
  for (let i = 0; i < ATTEMPTS; i++) {
    const start = performance.now()
    value = run()
    best = Math.min(best, performance.now() - start)
  }
  return { value, ms: best }
}

describe('10,000-word map', () => {
  it('generates ids ngsl:0001..ngsl:2809 then ext:<rank> with bands from the rank', () => {
    expect(words).toHaveLength(TOTAL)
    expect(words[0].id).toBe('ngsl:0001')
    expect(words[2808].id).toBe('ngsl:2809')
    expect(words[2809].id).toBe('ext:2810')
    expect(words[TOTAL - 1].band).toBe(SyntheticWords.bandCount(TOTAL))
    expect(words.every(w => w.band === bandOf(w.rank))).toBe(true)
  })

  it('plans a session over 10,000 words and 5,000 user rows within the budget', () => {
    const planner = new SessionPlanner()
    const input = { words, userWords, today: TODAY, dailyNew: DAILY_NEW, doneNew: 0 }
    planner.plan(input)
    const { value, ms } = timed(() => planner.plan(input))
    expect(value.fresh).toEqual(words.slice(STARTED, STARTED + DAILY_NEW).map(w => w.id))
    expect(value.due.length).toBeLessThanOrEqual(SessionPlanner.DUE_CAP)
    expect(ms).toBeLessThan(BUDGET_MS)
  })

  it('computes stats over the loaded word count within the budget', () => {
    const calculator = new StatsCalculator()
    const input = { userWords, dayStats: [], reviewLogs: [], totalWords: TOTAL, today: TODAY }
    calculator.compute(input)
    const { value, ms } = timed(() => calculator.compute(input))
    expect(value.counts[Status.Known]).toBe(STARTED)
    expect(value.counts[Status.Unknown]).toBe(TOTAL - STARTED)
    expect(value.percentKnown).toBe(50)
    expect(ms).toBeLessThan(BUDGET_MS)
  })

  it('percentages follow the word count, not a fixed map size', () => {
    const calculator = new StatsCalculator()
    const counts = calculator.counts(userWords.slice(0, 1716), TOTAL)
    expect(calculator.percentKnown(counts, TOTAL)).toBe(17)
    expect(calculator.percentKnown(counts, SyntheticFormat.CORE_COUNT)).toBe(61)
  })
})
