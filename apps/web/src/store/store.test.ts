import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { assumedDue, Grade, PlacementConfig, Status, Theme, type PlacementSubmission } from '@wordmap/shared'
import { FakeEnv, FakeServer, TestKit } from '../api/testKit'
import { MutationKind, type OfflineStore } from '../api'
import { StoreConfig } from './StoreConfig'
import {
  BandFilter, SessionItemKind, createAppStore, selectBandRows, selectBandSummary, selectBandTiles,
  selectCurrentCard, selectNextWords, statusOfRank,
} from './index'

const PLACE_LEVEL = 110
const ASSUMED_MARGIN = PlacementConfig.ASSUMED_MARGIN
const LARGE_COUNT = 10000
const BAND_SIZE = 100
const WAIT_STEP_MS = 10
const WAIT_LIMIT = 300

async function waitFor(check: () => boolean): Promise<void> {
  for (let i = 0; i < WAIT_LIMIT && !check(); i++) await new Promise(r => setTimeout(r, WAIT_STEP_MS))
}

function submission(level: number, tappedKnownIds: string[]): PlacementSubmission {
  return { level, tappedKnownIds, probes: [] }
}

describe('app store', () => {
  let server: FakeServer
  let env: FakeEnv
  let offline: OfflineStore
  let useStore: ReturnType<typeof createAppStore>

  const build = () => {
    const engine = server.engine(offline, env)
    useStore = createAppStore({ api: server.client(), offline, engine, clock: () => TestKit.NOW })
    return useStore.getState()
  }

  const seedCache = async () => {
    await offline.saveWords('v1', server.words, TestKit.NOW)
    await offline.saveSettings(TestKit.settings({ dailyNew: 5 }))
  }

  beforeEach(() => {
    server = new FakeServer()
    env = new FakeEnv()
    offline = TestKit.freshStore()
  })

  it('first load fetches words from the API and derives progress', async () => {
    await build().init()
    const s = useStore.getState()
    expect(s.ready).toBe(true)
    expect(s.words).toHaveLength(TestKit.WORD_COUNT)
    expect(s.byRank.get(7)?.id).toBe('w7')
    expect(s.progress.counts[Status.Unknown]).toBe(TestKit.WORD_COUNT)
    expect(s.progress.bands).toHaveLength(3)
    expect(s.progress.markerRank).toBe(1)
  })

  it('hydrates instantly from IndexedDB while the server is down', async () => {
    await seedCache()
    await offline.putUserWords([TestKit.row('w3', '2026-06-09T10:00:00.000Z', { status: Status.Known, due: '2026-07-01' })])
    server.down = true
    env.online = false
    await build().init()
    const s = useStore.getState()
    expect(s.ready).toBe(true)
    expect(statusOfRank(s, 3)).toBe(Status.Known)
    expect(s.progress.percentKnown).toBe(Math.round((1 / TestKit.WORD_COUNT) * 100))
    expect(s.loadError).toBeNull()
  })

  it('plans, runs and summarises a session with again-requeue', async () => {
    await seedCache()
    await offline.putUserWords([TestKit.row('w1', '2026-06-08T10:00:00.000Z', { due: '2026-06-10' })])
    env.online = false
    const s = build()
    await s.init()
    expect(useStore.getState().plan.due).toEqual(['w1'])
    expect(useStore.getState().plan.fresh).toEqual(['w2', 'w3', 'w4', 'w5', 'w6'])

    useStore.getState().startSession()
    expect(useStore.getState().session?.queue).toHaveLength(6)
    expect(selectCurrentCard(useStore.getState())?.item.kind).toBe(SessionItemKind.Review)

    await useStore.getState().grade(Grade.Again)
    expect(useStore.getState().session?.queue).toHaveLength(7)
    await useStore.getState().know()
    for (let i = 0; i < 4; i++) await useStore.getState().learn()
    expect(useStore.getState().session?.summary).toBeNull()
    await useStore.getState().grade(Grade.Good)

    const done = useStore.getState()
    const summary = done.session?.summary
    expect(summary).toMatchObject({ reviewed: 1, accuracy: 0, newLearned: 4, known: 1, streak: 1, streakIncreased: true })
    expect(done.todayDone).toBe(true)
    expect(done.canLearnMore).toBe(true)
    expect(statusOfRank(done, 2)).toBe(Status.Known)
    expect(statusOfRank(done, 3)).toBe(Status.Learning)
    expect(done.reviewLogs).toHaveLength(2)
    expect(done.sync.pending).toBeGreaterThan(0)
  })

  it('ignores answers of the wrong kind and learnMore queues a fresh batch', async () => {
    await seedCache()
    env.online = false
    await build().init()
    useStore.getState().startSession()
    await useStore.getState().grade(Grade.Good)
    expect(useStore.getState().session?.index).toBe(0)
    useStore.getState().closeSession()
    useStore.getState().learnMore()
    const expected = Array.from({ length: StoreConfig.LEARN_MORE_BATCH }, (_, i) => `w${i + 1}`)
    expect(useStore.getState().session?.queue.map(i => i.wordId)).toEqual(expected)
  })

  it('submits placement as assumed-known rows without touching studied words', async () => {
    await seedCache()
    await offline.putUserWords([TestKit.row('w5', '2026-06-09T10:00:00.000Z')])
    env.online = false
    await build().init()
    const known = await useStore.getState().submitPlacement(submission(PLACE_LEVEL, ['w120']))
    const s = useStore.getState()
    expect(known).toBe(PLACE_LEVEL - ASSUMED_MARGIN + 1)
    expect(s.settings.placementDone).toBe(true)
    expect(s.userWords.get('w6')?.assumed).toBe(true)
    expect(s.userWords.get('w120')?.assumed).toBe(true)
    expect(s.userWords.get('w5')?.assumed).toBe(false)
    expect(s.userWords.get('w6')?.due).toBe(assumedDue(6, s.today))
    expect(s.userWords.get('w6')?.due).not.toBe(s.userWords.get('w7')?.due)
    expect(s.userWords.get('w130')).toBeUndefined()
  })

  it('queues the submission in the outbox when offline and posts it on reconnect', async () => {
    await seedCache()
    env.online = false
    await build().init()
    const sent = submission(PLACE_LEVEL, [])
    await useStore.getState().submitPlacement(sent)
    const queued = (await offline.pending()).filter(e => e.kind === MutationKind.Placement)
    expect(queued).toHaveLength(1)
    expect(queued[0].payload).toEqual(sent)
    expect(server.placements).toHaveLength(0)
    env.goOnline()
    await useStore.getState().refresh()
    expect(server.placements).toEqual([sent])
    expect((await offline.pending()).filter(e => e.kind === MutationKind.Placement)).toHaveLength(0)
  })

  it('retaking placement clears earlier assumed words but keeps studied ones', async () => {
    await seedCache()
    await offline.putUserWords([TestKit.row('w5', '2026-06-09T10:00:00.000Z')])
    env.online = false
    await build().init()
    await useStore.getState().submitPlacement(submission(PLACE_LEVEL, []))
    await useStore.getState().submitPlacement(submission(ASSUMED_MARGIN, ['w200']))
    const s = useStore.getState()
    expect(s.userWords.get('w6')?.status).toBe(Status.Unknown)
    expect(s.userWords.get('w200')?.assumed).toBe(true)
    expect(s.userWords.get('w5')?.assumed).toBe(false)
    expect(s.userWords.get('w5')?.status).toBe(Status.Learning)
  })

  it('updates settings optimistically and persists them', async () => {
    await seedCache()
    env.online = false
    await build().init()
    await useStore.getState().updateSettings({ dailyNew: 8, theme: Theme.Dark })
    expect(useStore.getState().settings).toMatchObject({ dailyNew: 8, theme: Theme.Dark })
    expect(useStore.getState().plan.goalNew).toBe(8)
    expect((await offline.loadSettings())?.dailyNew).toBe(8)
  })

  it('searches locally and remembers recent searches', async () => {
    await seedCache()
    env.online = false
    await build().init()
    const hits = useStore.getState().search('word12')
    expect(hits[0].lemma).toBe('word12')
    expect(hits.length).toBeGreaterThan(1)
    await useStore.getState().rememberSearch('Word12')
    await useStore.getState().rememberSearch('word7')
    await useStore.getState().rememberSearch('word12')
    expect(useStore.getState().recentSearches).toEqual(['word12', 'word7'])
    expect(await offline.getRecent()).toEqual(['word12', 'word7'])
  })

  it('exposes band tiles, rows with filter and next words', async () => {
    await seedCache()
    await offline.putUserWords([TestKit.row('w1', '2026-06-09T10:00:00.000Z', { status: Status.Known })])
    env.online = false
    await build().init()
    const s = useStore.getState()
    const tiles = selectBandTiles(s, 1)
    expect(tiles).toHaveLength(100)
    expect(tiles.find(t => t.isMarker)?.rank).toBe(2)
    expect(selectBandRows(s, 1, BandFilter.Known).map(r => r.rank)).toEqual([1])
    expect(selectNextWords(s, 3).map(w => w.rank)).toEqual([2, 3, 4])
  })

  it('exports, rejects bad imports and resets through the server', async () => {
    await seedCache()
    env.online = false
    await build().init()
    await useStore.getState().startLearning('w9')
    const snapshot = await useStore.getState().exportData()
    expect(snapshot.userWords.map(u => u.wordId)).toContain('w9')
    await expect(useStore.getState().importData('{nope')).rejects.toThrow()
    await expect(useStore.getState().resetProgress()).rejects.toThrow()
    expect(useStore.getState().userWords.has('w9')).toBe(true)
  })
  it('refreshes the cached word list when the server content version changes and keeps progress', async () => {
    await seedCache()
    await offline.putUserWords([TestKit.row('w3', '2026-06-09T10:00:00.000Z', { status: Status.Known, due: '2026-07-01' })])
    const grown = TestKit.words(LARGE_COUNT)
    server.words = grown
    server.contentVersion = 'v2'
    await build().init()
    await waitFor(() => useStore.getState().contentVersion === 'v2')
    const s = useStore.getState()
    expect(s.words).toHaveLength(LARGE_COUNT)
    expect(s.progress.bands).toHaveLength(Math.ceil(LARGE_COUNT / BAND_SIZE))
    expect(statusOfRank(s, 3)).toBe(Status.Known)
    expect((await offline.loadWords())?.contentVersion).toBe('v2')
    const known = s.progress.counts[Status.Known]
    expect(s.progress.percentKnown).toBeCloseTo((known / LARGE_COUNT) * 100, 1)
  })

  it('keeps the learner name in settings and queues the change in the outbox while offline', async () => {
    await seedCache()
    env.online = false
    await build().init()
    await useStore.getState().updateSettings({ learnerName: 'Linh' })
    expect(useStore.getState().settings.learnerName).toBe('Linh')
    expect((await offline.loadSettings())?.learnerName).toBe('Linh')
    const kinds = (await offline.pending()).map(e => e.kind)
    expect(kinds).toContain(MutationKind.Settings)
    expect((await useStore.getState().exportData()).settings.learnerName).toBe('Linh')
  })

  it('derives bands and next words from a 10,000-word map', async () => {
    server.words = TestKit.words(LARGE_COUNT)
    await build().init()
    const s = useStore.getState()
    expect(s.progress.bands).toHaveLength(LARGE_COUNT / BAND_SIZE)
    expect(selectBandTiles(s, LARGE_COUNT / BAND_SIZE)).toHaveLength(BAND_SIZE)
    expect(selectNextWords(s, 2).map(w => w.rank)).toEqual([1, 2])
    expect(s.search('word9999').map(h => h.rank)).toContain(9999)
  })
})
