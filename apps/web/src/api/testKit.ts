import 'fake-indexeddb/auto'
import {
  Cefr, ExampleSource, ListId, Theme, Voice,
  type DayStat, type ExportSnapshot, type PlacementSubmission, type ReviewLog, type Settings, type SyncPayload, type UserWord, type Word,
} from '@wordmap/shared'
import { ApiClient } from './ApiClient'
import type { AuthTokenProvider } from './AuthTokenProvider'
import { DefaultSettings, OfflineStore } from './OfflineStore'
import { SyncEngine } from './SyncEngine'
import type { EnvHandlers, SyncEnvironment } from './SyncEnvironment'

export class TestKit {
  static readonly WORD_COUNT = 250
  static readonly NOW = new Date(2026, 5, 10, 9, 0, 0)
  private static dbSeq = 0

  static words(count: number = TestKit.WORD_COUNT): Word[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `w${i + 1}`, lemma: `word${i + 1}`, rank: i + 1, band: Math.ceil((i + 1) / 100), pos: ['noun'],
      definitions: [{ pos: 'noun', text: `definition ${i + 1}` }],
      examples: [{ text: `Example ${i + 1}`, source: ExampleSource.Custom }],
      cefr: Cefr.A1, listIds: [ListId.Ngsl],
    }))
  }

  static freshStore(): OfflineStore {
    return new OfflineStore(`wordmap-test-${TestKit.dbSeq++}`)
  }

  static row(wordId: string, updatedAt: string, patch: Partial<UserWord> = {}): UserWord {
    return {
      wordId, status: 'learning' as UserWord['status'], assumed: false, ease: 2.5, interval: 1, reps: 1, lapses: 0,
      due: '2026-06-11', updatedAt, ...patch,
    }
  }

  static settings(patch: Partial<Settings> = {}): Settings {
    return { ...DefaultSettings.create(), theme: Theme.Light, voice: Voice.Us, ...patch }
  }
}

/** Manual connectivity and timers for deterministic sync tests. */
export class FakeEnv implements SyncEnvironment {
  online = true
  delays: number[] = []
  private handlers: EnvHandlers | null = null
  private timers: Array<() => void> = []

  isOnline = () => this.online
  schedule(fn: () => void, ms: number): () => void {
    this.delays.push(ms)
    this.timers.push(fn)
    return () => undefined
  }

  listen(handlers: EnvHandlers): () => void {
    this.handlers = handlers
    return () => {
      this.handlers = null
    }
  }

  goOnline(): void {
    this.online = true
    this.handlers?.onOnline()
  }

  goOffline(): void {
    this.online = false
    this.handlers?.onOffline()
  }

  fireTimers(): void {
    const due = this.timers
    this.timers = []
    due.forEach(t => t())
  }
}

/** In-memory server behind a mocked fetch: health, words, state, sync with LWW and idempotent logs. */
export class FakeServer {
  userWords = new Map<string, UserWord>()
  logs = new Map<string, ReviewLog>()
  dayStats = new Map<string, DayStat>()
  settings: Settings = TestKit.settings()
  syncCalls: SyncPayload[] = []
  placements: PlacementSubmission[] = []
  failNext: Array<'network' | number> = []
  dropResponseNext = false
  down = false
  words = TestKit.words()
  contentVersion = 'v1'
  imports: ExportSnapshot[] = []
  tokens: Array<string | null> = []
  accept: ((token: string | null) => boolean) | null = null

  fetch: typeof fetch = async (input, init) => {
    const url = String(input)
    const token = new Headers(init?.headers).get('Authorization')?.replace(/^Bearer /, '') ?? null
    this.tokens.push(token)
    const isPublic = url.endsWith('/health') || url.includes('/content/')
    if (this.accept && !isPublic && !this.accept(token)) {
      return this.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, 401)
    }
    if (this.down) throw new TypeError('Failed to fetch')
    const failure = this.failNext.shift()
    if (failure === 'network') throw new TypeError('Failed to fetch')
    if (typeof failure === 'number') return this.json({ error: { code: 'validation_error', message: 'bad' } }, failure)
    const res = this.route(url, init)
    if (this.dropResponseNext && url.endsWith('/sync')) {
      this.dropResponseNext = false
      throw new TypeError('connection reset')
    }
    return res
  }

  client(auth?: AuthTokenProvider): ApiClient {
    return new ApiClient({ baseUrl: '/api', fetchImpl: this.fetch, auth })
  }

  engine(store: OfflineStore, env: FakeEnv, ids?: () => string, auth?: AuthTokenProvider): SyncEngine {
    let n = 0
    return new SyncEngine({
      store, api: this.client(auth), env, clock: () => TestKit.NOW, newId: ids ?? (() => `id-${n++}`),
    })
  }

  private route(url: string, init?: RequestInit): Response {
    if (url.endsWith('/health')) return this.json({ ok: true, contentVersion: this.contentVersion })
    if (url.endsWith('/content/words')) return this.json({ contentVersion: this.contentVersion, words: this.words })
    if (url.endsWith('/state')) return this.json(this.state())
    if (url.endsWith('/sync')) return this.json(this.sync(JSON.parse(String(init?.body)) as SyncPayload))
    if (url.endsWith('/import')) {
      const snapshot = JSON.parse(String(init?.body)) as ExportSnapshot
      this.imports.push(snapshot)
      snapshot.userWords.forEach(u => this.userWords.set(u.wordId, u))
      snapshot.dayStats.forEach(d => this.dayStats.set(d.date, d))
      this.settings = snapshot.settings
      return this.json({ ok: true })
    }
    if (url.endsWith('/placement')) {
      this.placements.push(JSON.parse(String(init?.body)) as PlacementSubmission)
      return this.json({ knownCount: 0, state: this.state() })
    }
    return this.json({ error: { code: 'not_found', message: url } }, 404)
  }

  private state() {
    return {
      settings: this.settings, userWords: [...this.userWords.values()], dayStats: [...this.dayStats.values()],
      reviewLogs: [...this.logs.values()], serverTime: '2026-06-10T09:00:00.000Z',
    }
  }

  private sync(payload: SyncPayload) {
    this.syncCalls.push(payload)
    for (const u of payload.changes.userWords) {
      const cur = this.userWords.get(u.wordId)
      if (!cur || u.updatedAt > cur.updatedAt) this.userWords.set(u.wordId, u)
    }
    for (const l of payload.changes.reviewLogs) this.logs.set(l.id, l)
    for (const d of payload.changes.dayStats) this.dayStats.set(d.date, d)
    if (payload.changes.settings) this.settings = payload.changes.settings
    return {
      serverChanges: {
        userWords: [...this.userWords.values()], reviewLogs: [], dayStats: [...this.dayStats.values()],
        settings: this.settings,
      },
      serverTime: '2026-06-10T09:00:01.000Z',
    }
  }

  private json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
