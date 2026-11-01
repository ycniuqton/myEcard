import { gunzipSync } from 'node:zlib'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DateUtil, Grade, KnowAnswer, ReviewMode, Status, Theme,
  type DayStat, type ExportSnapshot, type ReviewResponse, type SearchResponse, type SessionResponse,
  type Settings, type StateResponse, type StatsResponse, type UserWord, type WordsResponse,
} from '@wordmap/shared'
import { Ids, TestApp, TestClock, TestPaths, TestTime } from './TestApp'

const W1 = 'ngsl:0001'
const W2 = 'ngsl:0002'
const TODAY = DateUtil.iso(new Date(TestTime.START))

let app: FastifyInstance
let clock: TestClock
const api = <T>(m: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) => TestApp.json<T>(app, m, url, body)
const review = (wordId: string, grade: Grade = Grade.Good, clientId = Ids.client()) =>
  api<ReviewResponse>('POST', '/api/reviews', { wordId, grade, at: clock.iso(), clientId })

beforeEach(async () => {
  clock = new TestClock()
  app = await TestApp.create(clock)
})
afterEach(async () => {
  await app.close()
})

describe('health and content', () => {
  it('GET /health reports content version', async () => {
    const res = await api<{ ok: boolean; contentVersion: string }>('GET', '/api/health')
    expect(res.body).toEqual({ ok: true, contentVersion: 'fixture-1' })
  })

  it('GET /content/words sends ETag, cache header and 304 on match', async () => {
    const first = await app.inject({ method: 'GET', url: '/api/content/words' })
    const etag = first.headers.etag as string
    expect(etag).toBeTruthy()
    expect(first.headers['cache-control']).toContain('max-age')
    expect((first.json() as WordsResponse).words).toHaveLength(25)
    const second = await app.inject({ method: 'GET', url: '/api/content/words', headers: { 'if-none-match': etag } })
    expect(second.statusCode).toBe(304)
  })

  it('GET /content/words gzips when accepted', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/content/words', headers: { 'accept-encoding': 'gzip' } })
    expect(res.headers['content-encoding']).toBe('gzip')
    const parsed = JSON.parse(gunzipSync(res.rawPayload).toString('utf8')) as WordsResponse
    expect(parsed.contentVersion).toBe('fixture-1')
  })

  it('GET /content/credits returns credits', async () => {
    const res = await api<{ name: string }[]>('GET', '/api/content/credits')
    expect(res.body[0].name).toBe('Fixture')
  })
})

describe('search', () => {
  it('ranks exact before prefix and includes status', async () => {
    await api('POST', `/api/words/${W1}/learn`)
    const res = await api<SearchResponse>('GET', '/api/words/search?q=alpha&limit=5')
    expect(res.body.hits[0]).toMatchObject({ id: W1, lemma: 'alpha', status: Status.Learning })
    expect(res.body.hits[0].definition).toContain('alpha')
  })

  it('finds by inflected form and returns empty for no query', async () => {
    const byForm = await api<SearchResponse>('GET', '/api/words/search?q=alphas')
    expect(byForm.body.hits.map(h => h.id)).toContain(W1)
    const none = await api<SearchResponse>('GET', '/api/words/search')
    expect(none.body.hits).toEqual([])
  })
})

describe('state and settings', () => {
  it('GET /state returns defaults on a fresh database', async () => {
    const res = await api<StateResponse>('GET', '/api/state')
    expect(res.body.settings).toMatchObject({ dailyNew: 5, placementDone: false, theme: Theme.System })
    expect(res.body.userWords).toEqual([])
    expect(res.body.dayStats).toEqual([])
    expect(res.body.reviewLogs).toEqual([])
    expect(res.body.serverTime).toBe(TestTime.START)
  })

  it('PUT /settings patches partially and clears reminderTime with null', async () => {
    const set = await api<Settings>('PUT', '/api/settings', { dailyNew: 8, reminderTime: '07:30', theme: Theme.Dark })
    expect(set.body).toMatchObject({ dailyNew: 8, reminderTime: '07:30', theme: Theme.Dark })
    const cleared = await api<Settings>('PUT', '/api/settings', { reminderTime: null })
    expect(cleared.body.reminderTime).toBeUndefined()
    expect(cleared.body.dailyNew).toBe(8)
  })

  it('PUT /settings rejects invalid values with the uniform error body', async () => {
    const res = await api<{ error: { code: string; message: string } }>('PUT', '/api/settings', { dailyNew: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('validation_error')
  })
})

describe('placement', () => {
  type PlacementBody = { knownCount: number; state: StateResponse }
  const place = (level: number, tappedKnownIds: string[] = [], probes: unknown[] = []) =>
    api<PlacementBody>('POST', '/api/placement', { level, tappedKnownIds, probes })

  beforeEach(async () => {
    await app.close()
    app = await TestApp.create(clock, undefined, TestPaths.LARGE_FIXTURES)
  })

  it('marks ranks up to level-100 plus tapped words as assumed-known with spread due dates', async () => {
    const res = await place(110, ['ngsl:0020'])
    expect(res.body.knownCount).toBe(11)
    const rows = res.body.state.userWords
    expect(rows).toHaveLength(11)
    expect(rows.every(r => r.assumed && r.status === Status.Known)).toBe(true)
    const due = (id: string) => rows.find(r => r.wordId === id)?.due
    expect(due('ngsl:0001')).toBe(DateUtil.addDays(TODAY, 31))
    expect(due('ngsl:0010')).toBe(DateUtil.addDays(TODAY, 40))
    expect(due('ngsl:0020')).toBe(DateUtil.addDays(TODAY, 50))
    expect(new Set(rows.map(r => r.due)).size).toBe(11)
    expect(res.body.state.settings.placementDone).toBe(true)
  })

  it('level at or below the margin assumes nothing but still completes placement', async () => {
    const res = await place(0)
    expect(res.body.knownCount).toBe(0)
    expect(res.body.state.userWords).toEqual([])
    expect(res.body.state.settings.placementDone).toBe(true)
  })

  it('logs probe answers with mode=placement and skips unknown or pseudo ids', async () => {
    const answers = [
      { wordId: 'ngsl:0001', known: true }, { wordId: 'ngsl:0002', known: false }, { wordId: 'blorent', known: true },
    ]
    const res = await place(50, [], [{ band: 1, answers }])
    const logs = res.body.state.reviewLogs.filter(l => l.mode === ReviewMode.Placement)
    expect(logs.map(l => [l.wordId, l.grade])).toEqual([
      ['ngsl:0001', KnowAnswer.Know], ['ngsl:0002', KnowAnswer.DontKnow],
    ])
  })

  it('retake clears only assumed rows and keeps genuinely learned and known words', async () => {
    await place(120)
    await api('POST', '/api/words/ngsl:0021/learn')
    await api('POST', '/api/words/ngsl:0005/know')
    const res = await place(60)
    const rows = res.body.state.userWords
    const status = (id: string) => rows.find(r => r.wordId === id)
    expect(status('ngsl:0021')?.status).toBe(Status.Learning)
    expect(status('ngsl:0005')).toMatchObject({ status: Status.Known, assumed: false })
    expect(status('ngsl:0012')?.status).toBe(Status.Unknown)
    expect(rows.filter(r => r.assumed)).toHaveLength(0)
    expect(res.body.state.settings.placementDone).toBe(true)
  })

  it('rejects malformed bodies, the old results shape and out-of-range levels', async () => {
    expect((await api('POST', '/api/placement', { level: 'nope' })).status).toBe(400)
    expect((await api('POST', '/api/placement', { results: [] })).status).toBe(400)
    expect((await place(-5)).status).toBe(400)
    expect((await place(251)).status).toBe(400)
  })
})

describe('word actions', () => {
  it('know, learn and reset change the stored row', async () => {
    const known = await api<UserWord>('POST', `/api/words/${W1}/know`)
    expect(known.body).toMatchObject({ status: Status.Known, assumed: false })
    const learning = await api<UserWord>('POST', `/api/words/${W1}/learn`)
    expect(learning.body).toMatchObject({ status: Status.Learning, due: TODAY })
    const reset = await api<null>('POST', `/api/words/${W1}/reset`)
    expect(reset.body).toBeNull()
    const state = await api<StateResponse>('GET', '/api/state')
    expect(state.body.userWords.find(u => u.wordId === W1)?.status).toBe(Status.Unknown)
  })

  it('returns 404 for an unknown word', async () => {
    const res = await api<{ error: { code: string } }>('POST', '/api/words/nope/know')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })
})

describe('reviews', () => {
  it('schedules, logs and bumps the day stat', async () => {
    const first = await review(W1)
    expect(first.body.userWord).toMatchObject({ status: Status.Learning, reps: 1, due: DateUtil.addDays(TODAY, 1) })
    expect(first.body.dayStat).toMatchObject({ date: TODAY, newLearned: 1, reviewed: 0 })
    const second = await review(W1, Grade.Again)
    expect(second.body.dayStat).toMatchObject({ newLearned: 1, reviewed: 1 })
    expect(second.body.userWord.lapses).toBe(1)
  })

  it('meets the goal when the new-word goal is reached', async () => {
    await api('PUT', '/api/settings', { dailyNew: 2 })
    await review(W1)
    const res = await review(W2)
    expect(res.body.dayStat).toMatchObject({ newLearned: 2, goalMet: true })
  })

  it('does not meet the goal from a single new word with nothing due', async () => {
    const res = await review(W1)
    expect(res.body.dayStat.goalMet).toBe(false)
  })

  it('meets the goal when all due reviews are done', async () => {
    await review(W1)
    await review(W2)
    clock.advanceHours(24)
    const first = await review(W1)
    expect(first.body.dayStat).toMatchObject({ reviewed: 1, goalMet: false })
    const last = await review(W2)
    expect(last.body.dayStat).toMatchObject({ reviewed: 2, goalMet: true })
  })

  it('validates the body and unknown words', async () => {
    const bad = await api('POST', '/api/reviews', { wordId: W1, grade: 'meh', at: clock.iso(), clientId: 'x' })
    expect(bad.status).toBe(400)
    const missing = await review('nope')
    expect(missing.status).toBe(404)
  })
})

describe('session and day', () => {
  it('lists due words first and fresh words up to the daily goal', async () => {
    await api('POST', `/api/words/${W1}/learn`)
    const res = await api<SessionResponse>('GET', `/api/session?date=${TODAY}`)
    expect(res.body.due).toEqual([W1])
    expect(res.body.fresh).toEqual(['ngsl:0002', 'ngsl:0003', 'ngsl:0004', 'ngsl:0005', 'ngsl:0006'])
    expect(res.body).toMatchObject({ doneNew: 0, goalNew: 5 })
  })

  it('reduces fresh by words learned today', async () => {
    await review(W1)
    const res = await api<SessionResponse>('GET', `/api/session?date=${TODAY}`)
    expect(res.body.doneNew).toBe(1)
    expect(res.body.fresh).toHaveLength(4)
    expect(res.body.fresh).not.toContain(W1)
  })

  it('requires a valid date', async () => {
    const res = await api('GET', '/api/session?date=today')
    expect(res.status).toBe(400)
  })

  it('POST /session/day sets counters', async () => {
    const res = await api<DayStat>('POST', '/api/session/day', { date: TODAY, newLearned: 3, goalMet: true })
    expect(res.body).toEqual({ date: TODAY, newLearned: 3, reviewed: 0, goalMet: true })
    const again = await api<DayStat>('POST', '/api/session/day', { date: TODAY, reviewed: 4 })
    expect(again.body).toEqual({ date: TODAY, newLearned: 3, reviewed: 4, goalMet: true })
  })
})

describe('stats', () => {
  it('computes counts, percent, streak, due and review series', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `ngsl:${String(i + 1).padStart(4, '0')}`)
    for (const id of ids) await api('POST', `/api/words/${id}/know`)
    await api('POST', `/api/words/ngsl:0101/learn`)
    await api('POST', '/api/session/day', { date: TODAY, goalMet: true })
    const res = await api<StatsResponse>('GET', `/api/stats?date=${TODAY}`)
    expect(res.body.counts).toMatchObject({ known: 20, learning: 1, unknown: 4 })
    expect(res.body.percentKnown).toBe(80)
    expect(res.body.streak).toEqual({ current: 1, best: 1 })
    expect(res.body.dueToday).toBe(1)
    expect(res.body.reviewsPerDay).toHaveLength(14)
  })
})

describe('export, import and reset', () => {
  it('round-trips a snapshot', async () => {
    await review(W1)
    await api('PUT', '/api/settings', { dailyNew: 9 })
    const snapshot = await api<ExportSnapshot>('GET', '/api/export')
    expect(snapshot.headers['content-disposition']).toContain('attachment')
    await api('DELETE', '/api/progress')
    const emptied = await api<StateResponse>('GET', '/api/state')
    expect(emptied.body.userWords).toEqual([])
    const imported = await api<StateResponse>('POST', '/api/import', snapshot.body)
    expect(imported.body.userWords).toHaveLength(1)
    expect(imported.body.settings.dailyNew).toBe(9)
    const again = await api<ExportSnapshot>('GET', '/api/export')
    expect(again.body.userWords).toEqual(snapshot.body.userWords)
    expect(again.body.reviewLogs).toEqual(snapshot.body.reviewLogs)
    expect(again.body.dayStats).toEqual(snapshot.body.dayStats)
  })

  it('DELETE /progress clears progress and placement flag but keeps preferences', async () => {
    await api('PUT', '/api/settings', { dailyNew: 7, placementDone: true })
    await review(W1)
    const res = await api<StateResponse>('DELETE', '/api/progress')
    expect(res.body.userWords).toEqual([])
    expect(res.body.dayStats).toEqual([])
    expect(res.body.settings).toMatchObject({ dailyNew: 7, placementDone: false })
  })

  it('rejects an invalid import body', async () => {
    const res = await api('POST', '/api/import', { version: 1 })
    expect(res.status).toBe(400)
  })
})

describe('errors', () => {
  it('unknown api routes return the JSON 404', async () => {
    const res = await api<{ error: { code: string } }>('GET', '/api/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('malformed JSON returns validation_error', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/reviews', payload: '{bad', headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('validation_error')
  })
})
