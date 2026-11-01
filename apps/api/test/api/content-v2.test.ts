import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DateUtil, Status, SyntheticFormat, SyntheticWords, Theme, Voice, type ExportSnapshot, type SessionResponse,
  type StatsResponse, type WordsResponse,
} from '@wordmap/shared'
import { Container } from '../../src/Container'
import { LargeContentFixture, LargeFixtureFormat } from '../support/LargeContentFixture'
import { TestApp, TestClock, TestPaths, TestTime } from './TestApp'

const TOTAL = SyntheticFormat.DEFAULT_TOTAL
const STARTED = 5000
const SLOW_MS = 600
const TODAY = DateUtil.iso(new Date(TestTime.START))
const DAILY_NEW = 5
const ASSUMED_MARGIN = 100

const apps: FastifyInstance[] = []
const open = async (contentDir: string) => {
  const app = await TestApp.create(new TestClock(), undefined, contentDir)
  apps.push(app)
  return app
}
const container = (contentDir: string) => Container.create(TestApp.config({ contentDir }))

afterEach(async () => {
  await Promise.all(apps.splice(0).map(a => a.close()))
})

describe('content version selection', () => {
  it('serves words.v2.json with its contentVersion and credits', async () => {
    const app = await open(LargeContentFixture.create())
    const health = await TestApp.json<{ contentVersion: string }>(app, 'GET', '/api/health')
    expect(health.body.contentVersion).toBe(LargeFixtureFormat.V2_VERSION)
    const words = await TestApp.json<WordsResponse>(app, 'GET', '/api/content/words')
    expect(words.body.contentVersion).toBe(LargeFixtureFormat.V2_VERSION)
    expect(words.body.words).toHaveLength(TOTAL)
    const credits = await TestApp.json<unknown[]>(app, 'GET', '/api/content/credits')
    expect(credits.body).toHaveLength(1)
  })

  it('prefers words.v2.json over words.v1.json when both exist', async () => {
    const app = await open(LargeContentFixture.create({ withV1: true }))
    const health = await TestApp.json<{ contentVersion: string }>(app, 'GET', '/api/health')
    expect(health.body.contentVersion).toBe(LargeFixtureFormat.V2_VERSION)
  })

  it('falls back to words.v1.json when v2 is absent and takes the version from the file', async () => {
    const app = await open(TestPaths.FIXTURES)
    const words = await TestApp.json<WordsResponse>(app, 'GET', '/api/content/words')
    expect(words.body.contentVersion).toBe('fixture-1')
    expect(words.body.words).toHaveLength(25)
  })

  it('reads a custom contentVersion string from words.v2.json', async () => {
    const app = await open(LargeContentFixture.create({ total: 300, version: '7' }))
    const health = await TestApp.json<{ contentVersion: string }>(app, 'GET', '/api/health')
    expect(health.body.contentVersion).toBe('7')
  })

  it('loads lists from the content directory and works without lists.json', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wm-lists-'))
    copyFileSync(join(TestPaths.FIXTURES, LargeFixtureFormat.V1_NAME), join(dir, LargeFixtureFormat.V1_NAME))
    writeFileSync(join(dir, 'lists.json'), JSON.stringify(LargeContentFixture.lists(['ngsl:0001', 'ext:2810'])))
    const withLists = await container(dir)
    expect(withLists.content.lists.map(l => l.id)).toEqual(['ngsl', 'extended'])
    await withLists.close()
    const bare = await container(TestPaths.FIXTURES)
    expect(bare.content.lists).toEqual([])
    await bare.close()
  })
})

describe('10,000-word map through the API', () => {
  const snapshot = (): ExportSnapshot => ({
    version: 1,
    exportedAt: TestTime.START,
    settings: { dailyNew: DAILY_NEW, theme: Theme.System, voice: Voice.Us, activeListId: 'ngsl', placementDone: true },
    userWords: SyntheticWords.userWords(SyntheticWords.generate(TOTAL), STARTED, Status.Known),
    reviewLogs: [],
    dayStats: [],
  })

  it('stats percentages and counts follow the loaded word count', async () => {
    const app = await open(LargeContentFixture.create())
    await TestApp.json(app, 'POST', '/api/import', snapshot())
    const res = await TestApp.json<StatsResponse>(app, 'GET', `/api/stats?date=${TODAY}`)
    expect(res.body.counts[Status.Known]).toBe(STARTED)
    expect(res.body.counts[Status.Unknown]).toBe(TOTAL - STARTED)
    expect(res.body.percentKnown).toBe(50)
  })

  it('plans the session from the first unstarted word with 5,000 rows', async () => {
    const app = await open(LargeContentFixture.create())
    await TestApp.json(app, 'POST', '/api/import', snapshot())
    const started = performance.now()
    const res = await TestApp.json<SessionResponse>(app, 'GET', `/api/session?date=${TODAY}`)
    const elapsed = performance.now() - started
    expect(res.body.fresh).toEqual(SyntheticWords.generate(STARTED + DAILY_NEW).slice(STARTED).map(w => w.id))
    expect(elapsed).toBeLessThan(SLOW_MS)
  })

  it('placement accepts any level up to the loaded word count and rejects beyond it', async () => {
    const app = await open(LargeContentFixture.create())
    const level = (n: number) => ({ level: n, tappedKnownIds: [], probes: [] })
    const ok = await TestApp.json<{ knownCount: number }>(app, 'POST', '/api/placement', level(TOTAL))
    expect(ok.status).toBe(200)
    expect(ok.body.knownCount).toBe(TOTAL - ASSUMED_MARGIN)
    const bad = await TestApp.json(app, 'POST', '/api/placement', level(TOTAL + 1))
    expect(bad.status).toBe(400)
  })
})
