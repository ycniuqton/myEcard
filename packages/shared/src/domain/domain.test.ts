import { describe, expect, it } from 'vitest'
import {
  Cefr, DateUtil, Grade, KnowAnswer, PlacementEngine, ReviewMode, SchedulerManager, SessionPlanner, Sm2Strategy,
  StatsCalculator, Status, StreakCalculator, assumedKnownCard, learningCard, newCard, schedule, bandOf,
  type DayStat, type ReviewLog, type UserWord, type Word,
} from '../index'

const now = new Date(2026, 9, 30)
const rng = () => 0.5
const base = () => learningCard(now)
const mature = (over = {}) => ({ ...base(), interval: 10, reps: 3, ...over })

describe('schedule grades', () => {
  it('good: 1 day, 3 days, then interval x ease', () => {
    let c = schedule(base(), Grade.Good, now, rng)
    expect(c.interval).toBe(1)
    c = schedule(c, Grade.Good, now, rng)
    expect(c.interval).toBe(3)
    c = schedule(c, Grade.Good, now, rng)
    expect(c.interval).toBe(8)
    expect(c.due).toBe('2026-11-07')
    expect(c.ease).toBe(2.5)
  })
  it('again: resets reps, 1 day, ease -0.2, floors at 1.3, counts lapse', () => {
    const c = schedule({ ...base(), reps: 4, interval: 20, ease: 1.4 }, Grade.Again, now, rng)
    expect(c).toMatchObject({ reps: 0, interval: 1, ease: 1.3, lapses: 1, status: Status.Learning })
    expect(schedule(c, Grade.Again, now, rng).lapses).toBe(2)
  })
  it('hard: interval x 1.2, min 1 day, ease -0.15, reps increments', () => {
    const c = schedule(mature(), Grade.Hard, now, rng)
    expect(c).toMatchObject({ interval: 12, ease: 2.35, reps: 4 })
    expect(schedule(base(), Grade.Hard, now, rng).interval).toBe(1)
  })
  it('easy: good x 1.3, ease +0.15', () => {
    const c = schedule(mature(), Grade.Easy, now, rng)
    expect(c.interval).toBe(33)
    expect(c.ease).toBe(2.65)
  })
  it('easy on first reviews uses 1 and 3 day bases', () => {
    expect(schedule(base(), Grade.Easy, now, rng).interval).toBe(1)
    expect(schedule({ ...base(), reps: 1 }, Grade.Easy, now, rng).interval).toBe(4)
  })
  it('ease never drops below 1.3 on repeated hard', () => {
    let c = mature({ ease: 1.35 })
    for (let i = 0; i < 5; i++) c = schedule(c, Grade.Hard, now, rng)
    expect(c.ease).toBe(1.3)
  })
  it('ease rounds to two decimals', () => {
    const c = schedule(mature({ ease: 2.333 }), Grade.Easy, now, rng)
    expect(c.ease).toBe(2.48)
  })
  it('does not mutate the input card', () => {
    const c = mature()
    const copy = { ...c }
    schedule(c, Grade.Good, now, rng)
    expect(c).toEqual(copy)
  })
})

describe('status and fuzz', () => {
  it('known at 21 days, mastered at 90', () => {
    expect(schedule(mature({ interval: 9 }), Grade.Good, now, rng).status).toBe(Status.Known)
    expect(schedule(mature({ interval: 40 }), Grade.Good, now, rng).status).toBe(Status.Mastered)
  })
  it('stays learning below 21 days', () => {
    expect(schedule(mature({ interval: 5 }), Grade.Good, now, rng).status).toBe(Status.Learning)
  })
  it('known word graded hard stays known; again drops to learning', () => {
    const k = mature({ status: Status.Known, interval: 5 })
    expect(schedule(k, Grade.Hard, now, rng).status).toBe(Status.Known)
    expect(schedule(k, Grade.Again, now, rng).status).toBe(Status.Learning)
  })
  it('fuzz stays within +-5% above 3 days', () => {
    const c = mature({ interval: 100 })
    const lo = schedule(c, Grade.Good, now, () => 0)
    const hi = schedule(c, Grade.Good, now, () => 0.999999)
    expect(lo.interval).toBe(Math.round(250 * 0.95))
    expect(hi.interval).toBeLessThanOrEqual(Math.round(250 * 1.05))
    for (let i = 0; i < 50; i++) {
      const v = schedule(c, Grade.Good, now, () => i / 50).interval
      expect(v).toBeGreaterThanOrEqual(237)
      expect(v).toBeLessThanOrEqual(263)
    }
  })
  it('fuzz never applies at 3 days or less', () => {
    expect(schedule(base(), Grade.Good, now, () => 0).interval).toBe(1)
    expect(schedule({ ...base(), reps: 1 }, Grade.Good, now, () => 0).interval).toBe(3)
    expect(new Sm2Strategy().fuzz(3, () => 0)).toBe(3)
    expect(new Sm2Strategy().fuzz(4, () => 0)).toBe(4)
  })
})

describe('assumed words and factories', () => {
  it('assumed card is known, due in 30 days', () => {
    const a = assumedKnownCard(now)
    expect(a).toMatchObject({ status: Status.Known, assumed: true, due: '2026-11-29', interval: 30 })
  })
  it('pass keeps known and clears assumed; again moves to learning', () => {
    const a = assumedKnownCard(now)
    const pass = schedule(a, Grade.Good, now, rng)
    expect(pass.status).toBe(Status.Known)
    expect(pass.assumed).toBe(false)
    expect(schedule(a, Grade.Again, now, rng).status).toBe(Status.Learning)
  })
  it('new and learning cards', () => {
    expect(newCard()).toMatchObject({ status: Status.Unknown, due: null, ease: 2.5, reps: 0 })
    expect(learningCard(now)).toMatchObject({ status: Status.Learning, due: '2026-10-30' })
  })
})

describe('SchedulerManager', () => {
  it('uses sm2 by default and rejects unknown strategies', () => {
    const m = new SchedulerManager()
    expect(m.schedule(base(), Grade.Good, now, rng).interval).toBe(1)
    expect(() => m.use('fsrs')).toThrow()
  })
  it('selects a registered custom strategy by config', () => {
    class Fixed extends Sm2Strategy {
      readonly kind: never = 'fixed' as never
      schedule(card: Parameters<Sm2Strategy['schedule']>[0]) {
        return { ...card, interval: 99 }
      }
    }
    const m = new SchedulerManager('fixed', [new Fixed()])
    expect(m.schedule(base(), Grade.Good, now).interval).toBe(99)
  })
})

const mk = (band: number, i: number): Word => ({
  id: `w${band}-${i}`, lemma: `l${band}-${i}`, rank: (band - 1) * 100 + i, band, pos: [],
  definitions: [], examples: [], listIds: [], cefr: Cefr.A1,
})
const engine = new PlacementEngine()
describe('placement', () => {
  const band1 = Array.from({ length: 5 }, (_, i) => mk(1, i + 1))
  it('groups by band and computes band of rank', () => {
    const g = engine.groupByBand([...band1, mk(2, 1)])
    expect(g.get(1)).toHaveLength(5)
    expect(g.get(2)).toHaveLength(1)
    expect(bandOf(100)).toBe(1)
    expect(bandOf(101)).toBe(2)
  })
  it('next new words are lowest-ranked unknown', () => {
    const words = [mk(2, 1), mk(1, 3), mk(1, 1), mk(1, 2)]
    const out = engine.nextNewWords(words, id => id !== 'w1-1', 2)
    expect(out.map(w => w.id)).toEqual(['w1-2', 'w1-3'])
  })
})

const day = (date: string, goalMet = true): DayStat => ({ date, newLearned: 0, reviewed: 0, goalMet })

describe('streaks', () => {
  const calc = new StreakCalculator()
  it('counts current and best with gaps', () => {
    const days = ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30'].map(d => day(d))
    expect(calc.calculate(days, '2026-10-30')).toEqual({ current: 2, best: 3 })
  })
  it('alive when yesterday met, dead after a gap', () => {
    expect(calc.calculate([day('2026-10-29')], '2026-10-30').current).toBe(1)
    expect(calc.calculate([day('2026-10-28')], '2026-10-30').current).toBe(0)
  })
  it('ignores days without goal met and handles empty', () => {
    expect(calc.calculate([day('2026-10-30', false)], '2026-10-30')).toEqual({ current: 0, best: 0 })
    expect(calc.calculate([], '2026-10-30')).toEqual({ current: 0, best: 0 })
  })
  it('crosses month and year boundaries', () => {
    const days = ['2026-12-30', '2026-12-31', '2027-01-01'].map(d => day(d))
    expect(calc.calculate(days, '2027-01-01')).toEqual({ current: 3, best: 3 })
  })
})

const uw = (id: string, status: Status, due: string | null = null): UserWord => ({
  wordId: id, status, assumed: false, ease: 2.5, interval: 1, reps: 1, lapses: 0, due, updatedAt: '2026-10-30T00:00:00Z',
})
const log = (wordId: string, at: string, grade: ReviewLog['grade'], id = wordId + at): ReviewLog => ({
  id, wordId, at, mode: ReviewMode.Flashcard, grade,
})

describe('stats', () => {
  const calc = new StatsCalculator()
  it('counts statuses and derives unknown from total', () => {
    const rows = [uw('a', Status.Learning), uw('b', Status.Known), uw('c', Status.Mastered), uw('d', Status.Known)]
    expect(calc.counts(rows, 10)).toEqual({ unknown: 6, learning: 1, known: 2, mastered: 1 })
  })
  it('percentKnown rounds and guards zero total', () => {
    const c = calc.counts([uw('a', Status.Known)], 3)
    expect(calc.percentKnown(c, 3)).toBe(33)
    expect(calc.percentKnown(c, 0)).toBe(0)
  })
  it('dueCounts: overdue and today count as today, tomorrow separate', () => {
    const rows = [uw('a', Status.Learning, '2026-10-29'), uw('b', Status.Learning, '2026-10-30'),
      uw('c', Status.Learning, '2026-10-31'), uw('d', Status.Learning, '2026-11-02'), uw('e', Status.Unknown)]
    expect(calc.dueCounts(rows, '2026-10-30')).toEqual({ dueToday: 2, dueTomorrow: 1 })
  })
  it('knownOverTime is cumulative from first know/good/easy only', () => {
    const logs = [
      log('a', '2026-10-01T10:00:00Z', Grade.Again),
      log('a', '2026-10-02T10:00:00Z', Grade.Good),
      log('a', '2026-10-03T10:00:00Z', Grade.Easy),
      log('b', '2026-10-02T11:00:00Z', KnowAnswer.Know),
      log('c', '2026-10-05T11:00:00Z', Grade.Hard),
      log('d', '2026-10-05T12:00:00Z', Grade.Easy),
    ]
    expect(calc.knownOverTime(logs)).toEqual([
      { date: '2026-10-02', total: 2 }, { date: '2026-10-05', total: 3 },
    ])
    expect(calc.knownOverTime([])).toEqual([])
  })
  it('reviewsPerDay returns 14 zero-filled days ending today', () => {
    const logs = [log('a', '2026-10-30T08:00:00Z', Grade.Good, '1'), log('b', '2026-10-30T09:00:00Z', Grade.Good, '2'),
      log('c', '2026-10-20T09:00:00Z', Grade.Good, '3'), log('d', '2026-09-01T09:00:00Z', Grade.Good, '4')]
    const out = calc.reviewsPerDay(logs, '2026-10-30')
    expect(out).toHaveLength(14)
    expect(out[13]).toEqual({ date: '2026-10-30', count: 2 })
    expect(out[0].date).toBe('2026-10-17')
    expect(out.find(p => p.date === '2026-10-20')?.count).toBe(1)
    expect(out.reduce((s, p) => s + p.count, 0)).toBe(3)
  })
  it('compute assembles a full StatsResponse', () => {
    const res = calc.compute({
      userWords: [uw('a', Status.Known, '2026-10-31')], dayStats: [day('2026-10-30')],
      reviewLogs: [log('a', '2026-10-30T08:00:00Z', Grade.Good)], totalWords: 4, today: '2026-10-30',
    })
    expect(res).toMatchObject({ percentKnown: 25, dueToday: 0, dueTomorrow: 1, streak: { current: 1, best: 1 } })
    expect(res.reviewsPerDay).toHaveLength(14)
  })
})

describe('SessionPlanner', () => {
  const planner = new SessionPlanner()
  const words = Array.from({ length: 30 }, (_, i) => mk(1, i + 1))
  it('plans due first then new words up to goal minus done', () => {
    const userWords = [uw('w1-1', Status.Learning, '2026-10-30'), uw('w1-2', Status.Known, '2026-11-30')]
    const plan = planner.plan({ words, userWords, today: '2026-10-30', dailyNew: 5, doneNew: 2 })
    expect(plan.due).toEqual(['w1-1'])
    expect(plan.fresh).toEqual(['w1-3', 'w1-4', 'w1-5'])
    expect(plan).toMatchObject({ doneNew: 2, goalNew: 5 })
  })
  it('caps due at 100 oldest first', () => {
    const many = Array.from({ length: 130 }, (_, i) => uw(`x${String(i).padStart(3, '0')}`, Status.Learning, '2026-10-01'))
    many.push(uw('old', Status.Learning, '2026-09-01'))
    const due = planner.dueIds(many, '2026-10-30')
    expect(due).toHaveLength(100)
    expect(due[0]).toBe('old')
  })
  it('no new words when goal already met, none when doneNew exceeds goal', () => {
    expect(planner.plan({ words, userWords: [], today: '2026-10-30', dailyNew: 5, doneNew: 5 }).fresh).toEqual([])
    expect(planner.plan({ words, userWords: [], today: '2026-10-30', dailyNew: 5, doneNew: 9 }).fresh).toEqual([])
  })
  it('skips started words and handles an exhausted list', () => {
    const userWords = words.map(w => uw(w.id, Status.Known, '2027-01-01'))
    expect(planner.plan({ words, userWords, today: '2026-10-30', dailyNew: 5, doneNew: 0 }).fresh).toEqual([])
    const some = [uw('w1-1', Status.Learning, '2026-11-05')]
    expect(planner.plan({ words, userWords: some, today: '2026-10-30', dailyNew: 2, doneNew: 0 }).fresh).toEqual(['w1-2', 'w1-3'])
  })
  it('unknown-status rows count as unstarted and are not due', () => {
    const userWords = [uw('w1-1', Status.Unknown, '2026-10-01')]
    const plan = planner.plan({ words, userWords, today: '2026-10-30', dailyNew: 1, doneNew: 0 })
    expect(plan.due).toEqual([])
    expect(plan.fresh).toEqual(['w1-1'])
  })
  it('learnMore returns an extra batch ignoring the goal', () => {
    const input = { words, userWords: [], today: '2026-10-30', dailyNew: 5, doneNew: 5 }
    expect(planner.learnMore(input)).toHaveLength(5)
    expect(planner.learnMore(input, 3)).toEqual(['w1-1', 'w1-2', 'w1-3'])
  })
})

describe('DateUtil', () => {
  it('adds days across months and leap years', () => {
    expect(DateUtil.addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(DateUtil.addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(DateUtil.addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('daysBetween and lastDays', () => {
    expect(DateUtil.daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(DateUtil.daysBetween('2026-11-02', '2026-10-30')).toBe(-3)
    expect(DateUtil.lastDays('2026-10-30', 3)).toEqual(['2026-10-28', '2026-10-29', '2026-10-30'])
    expect(DateUtil.iso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
