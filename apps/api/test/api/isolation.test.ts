import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  Grade, type DayStat, type ExportSnapshot, type ReviewResponse, type Settings, type StateResponse, type SyncResponse,
} from '@wordmap/shared'
import { AuthTestKit } from '../support/AuthTestKit'
import { Ids, TestApp, TestClock, UserFixtures } from './TestApp'

const W1 = 'ngsl:0001'
const W2 = 'ngsl:0002'
const EPOCH = '1970-01-01T00:00:00.000Z'

let app: FastifyInstance
let kit: AuthTestKit
let clock: TestClock
let alice: Record<string, string>
let bob: Record<string, string>

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
const call = <T>(who: Record<string, string>, method: Method, url: string, body?: unknown) =>
  TestApp.json<T>(app, method, url, body, who)
const stateOf = async (who: Record<string, string>) => (await call<StateResponse>(who, 'GET', '/api/state')).body
const review = (who: Record<string, string>, wordId: string, clientId = Ids.client()) =>
  call<ReviewResponse>(who, 'POST', '/api/reviews', { wordId, grade: Grade.Good, at: clock.iso(), clientId })

beforeAll(async () => {
  kit = await AuthTestKit.create()
  alice = await kit.bearer(UserFixtures.ALICE)
  bob = await kit.bearer(UserFixtures.BOB)
})
beforeEach(async () => {
  clock = new TestClock()
  app = await TestApp.createAuthenticated(kit, clock)
})
afterAll(async () => {
  await app?.close()
})

describe('two users on one server', () => {
  it('never see each other words, reviews, day stats or settings', async () => {
    await call(alice, 'POST', `/api/words/${W1}/learn`)
    await review(alice, W2)
    await call(alice, 'PUT', '/api/settings', { dailyNew: 11, learnerName: 'Alice' })
    const forBob = await stateOf(bob)
    expect(forBob.userWords).toEqual([])
    expect(forBob.reviewLogs).toEqual([])
    expect(forBob.dayStats).toEqual([])
    expect(forBob.settings.dailyNew).toBe(5)
    expect(forBob.settings.learnerName).toBeUndefined()
    const forAlice = await stateOf(alice)
    expect(forAlice.userWords.map(w => w.wordId)).toEqual([W1, W2])
    expect(forAlice.settings).toMatchObject({ dailyNew: 11, learnerName: 'Alice' })
  })

  it('treat the same client review id independently', async () => {
    const id = Ids.client()
    expect((await review(alice, W1, id)).status).toBe(200)
    const bobs = await review(bob, W2, id)
    expect(bobs.body.userWord.wordId).toBe(W2)
    expect((await stateOf(bob)).userWords.map(w => w.wordId)).toEqual([W2])
    expect((await stateOf(alice)).userWords.map(w => w.wordId)).toEqual([W1])
  })

  it('have separate stats, sessions, search status and sync streams', async () => {
    await call(alice, 'POST', `/api/words/${W1}/know`)
    const search = await call<{ hits: { id: string; status: string }[] }>(bob, 'GET', '/api/words/search?q=alpha')
    expect(search.body.hits[0].status).toBe('unknown')
    const sync = await call<SyncResponse>(bob, 'POST', '/api/sync', {
      since: EPOCH, changes: { userWords: [], reviewLogs: [], dayStats: [] },
    })
    expect(sync.body.serverChanges.userWords).toEqual([])
  })

  it('DELETE /progress only clears the caller', async () => {
    await call(alice, 'POST', `/api/words/${W1}/learn`)
    await call(bob, 'POST', `/api/words/${W2}/learn`)
    await call(bob, 'PUT', '/api/settings', { dailyNew: 9 })
    await call(alice, 'DELETE', '/api/progress')
    expect((await stateOf(alice)).userWords).toEqual([])
    const forBob = await stateOf(bob)
    expect(forBob.userWords.map(w => w.wordId)).toEqual([W2])
    expect(forBob.settings.dailyNew).toBe(9)
  })

  it('export contains only the caller and import replaces only the caller', async () => {
    await call(alice, 'POST', `/api/words/${W1}/learn`)
    await call(bob, 'POST', `/api/words/${W2}/learn`)
    const exported = await call<ExportSnapshot>(alice, 'GET', '/api/export')
    expect(exported.body.userWords.map(w => w.wordId)).toEqual([W1])
    const stat: DayStat = { date: '2026-03-01', newLearned: 1, reviewed: 0, goalMet: false }
    const settings: Settings = { ...exported.body.settings, dailyNew: 20 }
    await call(bob, 'POST', '/api/import', { ...exported.body, dayStats: [stat], settings })
    const forBob = await stateOf(bob)
    expect(forBob.userWords.map(w => w.wordId)).toEqual([W1])
    expect(forBob.dayStats).toEqual([stat])
    const forAlice = await stateOf(alice)
    expect(forAlice.userWords.map(w => w.wordId)).toEqual([W1])
    expect(forAlice.dayStats).toEqual([])
    expect(forAlice.settings.dailyNew).toBe(5)
  })
})
