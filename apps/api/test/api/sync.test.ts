import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DateUtil, Grade, ReviewMode, Status, Theme,
  type ReviewResponse, type StateResponse, type SyncChanges, type SyncResponse, type UserWord,
} from '@wordmap/shared'
import { Ids, TestApp, TestClock, TestTime } from './TestApp'

const W1 = 'ngsl:0001'
const W2 = 'ngsl:0002'
const EPOCH = '1970-01-01T00:00:00.000Z'
const TODAY = DateUtil.iso(new Date(TestTime.START))

let app: FastifyInstance
let clock: TestClock
const api = <T>(m: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) => TestApp.json<T>(app, m, url, body)
const empty = (): SyncChanges => ({ userWords: [], reviewLogs: [], dayStats: [] })
const sync = (changes: Partial<SyncChanges>, since = EPOCH) =>
  api<SyncResponse>('POST', '/api/sync', { since, changes: { ...empty(), ...changes } })
const row = (wordId: string, updatedAt: string, interval = 5): UserWord => ({
  wordId, status: Status.Learning, assumed: false, ease: 2.5, interval, reps: 1, lapses: 0, due: TODAY, updatedAt,
})

beforeEach(async () => {
  clock = new TestClock()
  app = await TestApp.create(clock)
})
afterEach(async () => {
  await app.close()
})

describe('duplicate client ids', () => {
  it('POST /reviews with the same clientId counts once and returns the stored result', async () => {
    const body = { wordId: W1, grade: Grade.Good, at: clock.iso(), clientId: 'dup-1' }
    const first = await api<ReviewResponse>('POST', '/api/reviews', body)
    const second = await api<ReviewResponse>('POST', '/api/reviews', body)
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
    const state = await api<StateResponse>('GET', '/api/state')
    expect(state.body.dayStats[0]).toMatchObject({ newLearned: 1, reviewed: 0 })
    const exported = await api<{ reviewLogs: unknown[] }>('GET', '/api/export')
    expect(exported.body.reviewLogs).toHaveLength(1)
  })

  it('GET /state returns stored review logs for hydration', async () => {
    const log = { id: 'log-1', wordId: W1, at: clock.iso(), mode: ReviewMode.Flashcard, grade: Grade.Good }
    await sync({ reviewLogs: [log] })
    const state = await api<{ reviewLogs: { id: string }[] }>('GET', '/api/state')
    expect(state.body.reviewLogs.map(l => l.id)).toEqual([log.id])
  })

  it('sync appends review logs idempotently by id', async () => {
    const log = { id: 'log-1', wordId: W1, at: clock.iso(), mode: ReviewMode.Flashcard, grade: Grade.Good }
    await sync({ reviewLogs: [log] })
    await sync({ reviewLogs: [log] })
    const exported = await api<{ reviewLogs: unknown[] }>('GET', '/api/export')
    expect(exported.body.reviewLogs).toHaveLength(1)
  })
})

describe('last-writer-wins on updatedAt', () => {
  it('an older client row loses and a newer one wins', async () => {
    const t1 = '2026-03-10T10:00:00.000Z'
    const t2 = '2026-03-10T11:00:00.000Z'
    const t0 = '2026-03-10T09:00:00.000Z'
    await sync({ userWords: [row(W1, t1, 5)] })
    await sync({ userWords: [row(W1, t0, 99)] })
    let state = await api<StateResponse>('GET', '/api/state')
    expect(state.body.userWords[0].interval).toBe(5)
    await sync({ userWords: [row(W1, t2, 42)] })
    state = await api<StateResponse>('GET', '/api/state')
    expect(state.body.userWords[0].interval).toBe(42)
  })

  it('a stale offline review does not overwrite a newer row but is still logged', async () => {
    await sync({ userWords: [row(W1, '2026-03-10T12:00:00.000Z', 30)] })
    const stale = await api<ReviewResponse>('POST', '/api/reviews', {
      wordId: W1, grade: Grade.Again, at: '2026-03-09T12:00:00.000Z', clientId: 'stale-1',
    })
    expect(stale.body.userWord.interval).toBe(30)
    const exported = await api<{ reviewLogs: unknown[] }>('GET', '/api/export')
    expect(exported.body.reviewLogs).toHaveLength(1)
  })

  it('settings use last-writer-wins via settingsUpdatedAt', async () => {
    const base = { dailyNew: 6, theme: Theme.Dark, voice: 'us', activeListId: 'ngsl', placementDone: false }
    const newer = '2026-03-10T13:00:00.000Z'
    await sync({ settings: base as never, settingsUpdatedAt: newer })
    await sync({ settings: { ...base, dailyNew: 1 } as never, settingsUpdatedAt: '2026-03-10T08:00:00.000Z' })
    const state = await api<StateResponse>('GET', '/api/state')
    expect(state.body.settings.dailyNew).toBe(6)
  })

  it('day stats merge monotonically', async () => {
    await sync({ dayStats: [{ date: TODAY, newLearned: 3, reviewed: 1, goalMet: false }] })
    await sync({ dayStats: [{ date: TODAY, newLearned: 2, reviewed: 4, goalMet: true }] })
    const state = await api<StateResponse>('GET', '/api/state')
    expect(state.body.dayStats[0]).toEqual({ date: TODAY, newLearned: 3, reviewed: 4, goalMet: true })
  })
})

describe('server changes since', () => {
  it('returns rows written after since and not the ones just uploaded', async () => {
    const first = await sync({ userWords: [row(W1, '2026-03-10T10:00:00.000Z')] })
    expect(first.body.serverChanges.userWords).toEqual([])
    clock.advanceHours(1)
    await api('POST', `/api/words/${W2}/learn`)
    const next = await sync({}, first.body.serverTime)
    expect(next.body.serverChanges.userWords.map(u => u.wordId)).toEqual([W2])
    clock.advanceHours(1)
    const after = await sync({}, next.body.serverTime)
    expect(after.body.serverChanges.userWords).toEqual([])
  })

  it('returns server review logs and settings changed since', async () => {
    const start = clock.iso()
    clock.advanceHours(1)
    await api('POST', '/api/reviews', { wordId: W1, grade: Grade.Good, at: clock.iso(), clientId: Ids.client() })
    await api('PUT', '/api/settings', { dailyNew: 12 })
    const res = await sync({}, start)
    expect(res.body.serverChanges.reviewLogs).toHaveLength(1)
    expect(res.body.serverChanges.settings?.dailyNew).toBe(12)
    expect(res.body.serverChanges.dayStats).toHaveLength(1)
  })

  it('rejects malformed sync bodies', async () => {
    const res = await api('POST', '/api/sync', { since: 1 })
    expect(res.status).toBe(400)
  })
})

describe('content fallback', () => {
  it('serves seed-built content when words.v1.json is missing', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'wm-content-'))
    writeFileSync(join(empty, 'unrelated.txt'), 'x')
    const { createApp } = await import('../../src/app')
    const seeded = await createApp(TestApp.config({ contentDir: empty }))
    const res = await TestApp.json<{ contentVersion: string }>(seeded, 'GET', '/api/health')
    expect(res.body.contentVersion).toBe('seed')
    await seeded.close()
  })
})
