import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { Grade, ReviewMode, Status } from '@wordmap/shared'
import { WordAction } from './ApiConfig'
import { MutationKind } from './OfflineStore'
import type { SyncEngine } from './SyncEngine'
import type { OfflineStore } from './OfflineStore'
import { FakeEnv, FakeServer, TestKit } from './testKit'

describe('SyncEngine', () => {
  let server: FakeServer
  let env: FakeEnv
  let store: OfflineStore
  let engine: SyncEngine

  beforeEach(async () => {
    server = new FakeServer()
    env = new FakeEnv()
    store = TestKit.freshStore()
    engine = server.engine(store, env)
    await store.saveSettings(TestKit.settings())
  })

  it('queues mutations offline and replays them when back online', async () => {
    env.online = false
    const first = await engine.recordReview({ wordId: 'w1', grade: Grade.Good })
    await engine.recordReview({ wordId: 'w2', grade: Grade.Easy })
    expect(first.userWord.status).toBe(Status.Learning)
    expect(server.syncCalls).toHaveLength(0)
    expect(engine.status().pending).toBeGreaterThan(0)

    await engine.start()
    env.goOnline()
    await engine.flush()

    expect(server.userWords.has('w1')).toBe(true)
    expect(server.userWords.has('w2')).toBe(true)
    expect(server.logs.size).toBe(2)
    expect(engine.status().pending).toBe(0)
    expect(engine.status().online).toBe(true)
  })

  it('does not double count a review when the response is lost and the batch is replayed', async () => {
    server.dropResponseNext = true
    await engine.recordReview({ wordId: 'w1', grade: Grade.Good })
    await engine.flush()
    expect(engine.status().pending).toBeGreaterThan(0)
    expect(engine.status().online).toBe(false)

    env.fireTimers()
    await engine.flush()

    expect(server.logs.size).toBe(1)
    expect(server.syncCalls.length).toBeGreaterThanOrEqual(2)
    expect(engine.status().pending).toBe(0)
  })

  it('merges server changes last-writer-wins on updatedAt', async () => {
    await store.putUserWords([
      TestKit.row('w1', '2026-06-10T08:00:00.000Z', { interval: 1 }),
      TestKit.row('w2', '2026-06-10T08:30:00.000Z', { interval: 9 }),
    ])
    server.userWords.set('w1', TestKit.row('w1', '2026-06-10T08:45:00.000Z', { interval: 5 }))
    server.userWords.set('w2', TestKit.row('w2', '2026-06-10T08:10:00.000Z', { interval: 2 }))
    server.userWords.set('w3', TestKit.row('w3', '2026-06-10T08:10:00.000Z'))

    await engine.refresh()

    expect((await store.getUserWord('w1'))?.interval).toBe(5)
    expect((await store.getUserWord('w2'))?.interval).toBe(9)
    expect(await store.getUserWord('w3')).toBeDefined()
  })

  it('hydrates server review logs into the local store on refresh', async () => {
    server.logs.set('log-1', { id: 'log-1', wordId: 'w1', at: '2026-06-09T08:00:00.000Z', mode: ReviewMode.Flashcard, grade: Grade.Good })

    await engine.refresh()

    expect((await store.getReviewLogs(['log-1']))[0]?.wordId).toBe('w1')
  })

  it('keeps a pending local settings change over the server copy', async () => {
    env.online = false
    await engine.recordSettings({ dailyNew: 12 })
    env.online = true
    server.settings = TestKit.settings({ dailyNew: 3 })
    await engine.flush()
    expect((await store.loadSettings())?.dailyNew).toBe(12)
    expect(server.settings.dailyNew).toBe(12)
  })

  it('ignores a duplicate outbox clientId', async () => {
    const entry = { clientId: 'dup', kind: MutationKind.Word, refId: 'w1', createdAt: 'x', attempts: 0 }
    expect(await store.enqueue(entry)).toBe(true)
    expect(await store.enqueue(entry)).toBe(false)
    expect(await store.pendingCount()).toBe(1)
  })

  it('backs off exponentially while the server is unreachable', async () => {
    env.online = false
    await engine.recordWordAction('w1', WordAction.Learn)
    env.online = true
    server.failNext = ['network', 'network', 'network']
    await engine.flush()
    env.fireTimers()
    await engine.flush()
    env.fireTimers()
    await engine.flush()
    expect(env.delays.slice(0, 3)).toEqual([1000, 2000, 4000])
    expect(engine.status().pending).toBeGreaterThan(0)
  })

  it('drops entries the server keeps rejecting', async () => {
    env.online = false
    await engine.recordWordAction('w1', WordAction.Learn)
    env.online = true
    server.failNext = [400, 400, 400]
    for (let i = 0; i < 3; i++) {
      await engine.flush()
      env.fireTimers()
    }
    expect(engine.status().pending).toBe(0)
  })

  it('marks goal met after the daily new-word goal and counts only fresh words', async () => {
    env.online = false
    await engine.recordSettings({ dailyNew: 2 })
    await engine.recordWordAction('w1', WordAction.Learn)
    const res = await engine.recordWordAction('w2', WordAction.Know)
    expect(res.dayStat.newLearned).toBe(2)
    expect(res.dayStat.goalMet).toBe(true)
    expect(res.userWord.assumed).toBe(true)
    const again = await engine.recordWordAction('w1', WordAction.Learn)
    expect(again.dayStat.newLearned).toBe(2)
  })
})
