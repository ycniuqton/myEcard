import { assumedDue, DateUtil, Status } from '@wordmap/shared'
import type {
  DayStat, Grade, PlacementSubmission, ReviewLog, Settings, StateResponse, SyncChanges, SyncPayload, UserWord,
} from '@wordmap/shared'
import { WordAction } from './ApiConfig'
import type { ApiClient } from './ApiClient'
import { ApiError } from './ApiError'
import { LocalMutator } from './LocalMutator'
import { MergePolicy } from './MergePolicy'
import { DefaultSettings, MutationKind, OfflineStore, type OutboxEntry } from './OfflineStore'
import { BrowserSyncEnvironment, type SyncEnvironment } from './SyncEnvironment'

export type SyncStatus = {
  online: boolean
  pending: number
  syncing: boolean
  lastSyncAt: string | null
  lastError: string | null
}

export type SyncDeps = {
  store: OfflineStore
  api: ApiClient
  mutator?: LocalMutator
  policy?: MergePolicy
  env?: SyncEnvironment
  clock?: () => Date
  newId?: () => string
}

export type ReviewInput = { wordId: string; grade: Grade; msTaken?: number }
export type AssumedWord = { wordId: string; rank: number }
export type MutationResult = { userWord: UserWord; dayStat: DayStat; reviewLog?: ReviewLog }

/** Retry and poison-entry limits for the outbox. */
export class SyncPolicy {
  static readonly BACKOFF_BASE_MS = 1_000
  static readonly BACKOFF_MAX_MS = 60_000
  static readonly MAX_REJECTED_ATTEMPTS = 3
}

/** Local-first mutations plus outbox flush and LWW merge against POST /sync. */
export class SyncEngine {
  private readonly store: OfflineStore
  private readonly api: ApiClient
  private readonly mutator: LocalMutator
  private readonly policy: MergePolicy
  private readonly env: SyncEnvironment
  private readonly clock: () => Date
  private readonly newId: () => string
  private readonly statusListeners = new Set<(s: SyncStatus) => void>()
  private readonly mergedListeners = new Set<() => void>()
  private current: SyncStatus
  private chain: Promise<unknown> = Promise.resolve()
  private flushing: Promise<void> | null = null
  private rerun = false
  private failures = 0
  private cancelRetry: (() => void) | null = null
  private unlisten: (() => void) | null = null
  private markHydrated: () => void = () => undefined
  private readonly hydrated = new Promise<void>(resolve => {
    this.markHydrated = resolve
  })

  constructor(deps: SyncDeps) {
    this.store = deps.store
    this.api = deps.api
    this.mutator = deps.mutator ?? new LocalMutator()
    this.policy = deps.policy ?? new MergePolicy()
    this.env = deps.env ?? new BrowserSyncEnvironment()
    this.clock = deps.clock ?? (() => new Date())
    this.newId = deps.newId ?? (() => crypto.randomUUID())
    this.current = { online: this.env.isOnline(), pending: 0, syncing: false, lastSyncAt: null, lastError: null }
  }

  status = (): SyncStatus => this.current

  subscribe(listener: (s: SyncStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  onMerged(listener: () => void): () => void {
    this.mergedListeners.add(listener)
    return () => this.mergedListeners.delete(listener)
  }

  async start(): Promise<void> {
    this.stop()
    this.unlisten = this.env.listen({
      onOnline: () => this.handleOnline(),
      onOffline: () => this.patch({ online: false }),
      onVisible: () => void this.flush(),
    })
    await this.refreshPending()
    await this.refresh()
  }

  stop(): void {
    this.unlisten?.()
    this.unlisten = null
    this.cancelRetry?.()
    this.cancelRetry = null
  }

  /** Resolves once local settings exist, or the first server state merge has finished or failed. */
  async whenHydrated(): Promise<void> {
    if (await this.store.loadSettings()) return
    await this.hydrated
  }

  async refresh(): Promise<void> {
    if (!this.env.isOnline()) {
      this.markHydrated()
      return
    }
    try {
      await this.merge(await this.api.state())
    } catch (error) {
      this.fail(error)
      return
    } finally {
      this.markHydrated()
    }
    await this.flush()
  }

  recordReview(input: ReviewInput): Promise<MutationResult> {
    return this.runMutation(async () => {
      const now = this.clock()
      const current = await this.store.getUserWord(input.wordId)
      const userWord = this.mutator.review(input.wordId, current, input.grade, now)
      const clientId = this.newId()
      const log = this.mutator.reviewLog(clientId, input.wordId, input.grade, now, input.msTaken)
      await this.store.putUserWords([userWord])
      await this.store.putReviewLogs([log])
      const dayStat = await this.touchDay(now, { reviewed: 1 })
      await this.enqueue(MutationKind.Review, input.wordId, clientId)
      return { userWord, dayStat, reviewLog: log }
    })
  }

  recordWordAction(wordId: string, action: WordAction): Promise<MutationResult> {
    return this.runMutation(async () => {
      const now = this.clock()
      const current = await this.store.getUserWord(wordId)
      const userWord = this.mutator.wordAction(wordId, current, action, now)
      await this.store.putUserWords([userWord])
      const fresh = action !== WordAction.Reset && (!current || current.status === Status.Unknown)
      const dayStat = await this.touchDay(now, { newLearned: fresh ? 1 : 0 })
      await this.enqueue(MutationKind.Word, wordId)
      return { userWord, dayStat }
    })
  }

  /** Applies a placement offline: assumed-known rows with spread due dates, resets for stale assumed rows, queued submission. */
  recordPlacement(submission: PlacementSubmission, assumed: AssumedWord[], clearIds: string[] = []): Promise<UserWord[]> {
    return this.runMutation(async () => {
      const now = this.clock()
      const ids = assumed.map(a => a.wordId)
      const keep = new Set(ids)
      const currents = await this.store.getUserWords(ids)
      const fresh = assumed.filter((_, i) => !currents[i] || currents[i]?.status === Status.Unknown)
      const stale = clearIds.filter(id => !keep.has(id))
      const staleCurrents = await this.store.getUserWords(stale)
      const cleared = stale.map((id, i) => this.mutator.wordAction(id, staleCurrents[i], WordAction.Reset, now))
      const rows = [...fresh.map(a => this.assumedRow(a, now)), ...cleared]
      await this.store.putUserWords(rows)
      await this.enqueue(MutationKind.Placement, MutationKind.Placement, undefined, submission)
      return rows
    })
  }

  recordSettings(patch: Partial<Settings>): Promise<Settings> {
    return this.runMutation(async () => {
      const base = (await this.store.loadSettings()) ?? DefaultSettings.create()
      const next = { ...base, ...patch }
      await this.store.saveSettings(next)
      await this.enqueue(MutationKind.Settings, MutationKind.Settings)
      return next
    })
  }

  flush(): Promise<void> {
    if (this.flushing) {
      this.rerun = true
      return this.flushing
    }
    this.flushing = this.drain().finally(() => {
      this.flushing = null
    })
    return this.flushing
  }

  private async drain(): Promise<void> {
    let ok = true
    do {
      this.rerun = false
      ok = await this.flushOnce()
    } while (this.rerun && ok)
  }

  private run<T>(job: () => Promise<T>): Promise<T> {
    const next = this.chain.then(job)
    this.chain = next.catch(() => undefined)
    return next
  }

  private runMutation<T>(job: () => Promise<T>): Promise<T> {
    return this.run(job).then(result => {
      if (this.env.isOnline()) void this.flush()
      return result
    })
  }

  private async touchDay(now: Date, delta: { newLearned?: number; reviewed?: number }): Promise<DayStat> {
    const date = DateUtil.iso(now)
    const settings = (await this.store.loadSettings()) ?? DefaultSettings.create()
    const current = await this.store.getDayStat(date)
    const grown = this.mutator.day(current, date, delta)
    const due = await this.store.countDue(date, Status.Unknown)
    const met = (grown.reviewed > 0 && due === 0) || grown.newLearned >= settings.dailyNew
    const next = this.mutator.day(grown, date, { goalMet: met })
    await this.store.putDayStats([next])
    await this.enqueue(MutationKind.Day, date)
    return next
  }

  private assumedRow(word: AssumedWord, now: Date): UserWord {
    const row = this.mutator.assumedKnown(word.wordId, undefined, now)
    return { ...row, due: assumedDue(word.rank, DateUtil.iso(now)) }
  }

  private async enqueue(kind: MutationKind, refId: string, clientId?: string, payload?: unknown): Promise<void> {
    const entry: OutboxEntry = {
      clientId: clientId ?? this.newId(), kind, refId, createdAt: this.clock().toISOString(), attempts: 0, payload,
    }
    await this.store.enqueue(entry)
    await this.refreshPending()
  }

  private async flushOnce(): Promise<boolean> {
    if (!this.env.isOnline()) return false
    this.patch({ syncing: true })
    const all = await this.store.pending()
    let entries = all
    try {
      entries = await this.postPlacements(all)
      const payload = await this.buildPayload(entries)
      const res = await this.api.sync(payload)
      await this.store.removeOutbox(entries.map(e => e.seq as number))
      await this.run(() => this.mergeChanges(res.serverChanges))
      await this.store.setCursor(res.serverTime)
      this.succeed(res.serverTime)
      return true
    } catch (error) {
      await this.handleFailure(error, entries)
      return false
    } finally {
      await this.refreshPending()
      this.patch({ syncing: false })
    }
  }

  private async postPlacements(entries: OutboxEntry[]): Promise<OutboxEntry[]> {
    for (const entry of entries.filter(e => e.kind === MutationKind.Placement)) {
      await this.api.placement(entry.payload as PlacementSubmission)
      await this.store.removeOutbox([entry.seq as number])
    }
    return entries.filter(e => e.kind !== MutationKind.Placement)
  }

  private async buildPayload(entries: OutboxEntry[]): Promise<SyncPayload> {
    const refs = (kind: MutationKind[]) => [...new Set(entries.filter(e => kind.includes(e.kind)).map(e => e.refId))]
    const wordIds = refs([MutationKind.Word, MutationKind.Review])
    const logIds = entries.filter(e => e.kind === MutationKind.Review).map(e => e.clientId)
    const hasSettings = entries.some(e => e.kind === MutationKind.Settings)
    const changes: SyncChanges = {
      userWords: (await this.store.getUserWords(wordIds)).filter((r): r is UserWord => !!r),
      reviewLogs: (await this.store.getReviewLogs(logIds)).filter((r): r is ReviewLog => !!r),
      dayStats: (await this.store.getDayStats(refs([MutationKind.Day]))).filter((r): r is DayStat => !!r),
      settings: hasSettings ? ((await this.store.loadSettings()) ?? undefined) : undefined,
    }
    return { since: await this.store.getCursor(), changes }
  }

  private async mergeChanges(changes: SyncChanges): Promise<void> {
    const words = changes.userWords ?? []
    const days = changes.dayStats ?? []
    const wordRows = this.policy.changedUserWords(await this.store.getUserWords(words.map(w => w.wordId)), words)
    const dayRows = this.policy.changedDayStats(await this.store.getDayStats(days.map(d => d.date)), days)
    const settingsChanged = await this.mergeSettings(changes.settings)
    await this.store.putUserWords(wordRows)
    await this.store.putDayStats(dayRows)
    await this.store.putReviewLogs(changes.reviewLogs ?? [])
    if (wordRows.length || dayRows.length || settingsChanged || (changes.reviewLogs ?? []).length) this.notifyMerged()
  }

  private async mergeSettings(remote: Settings | undefined): Promise<boolean> {
    if (!remote) return false
    const pending = (await this.store.pending()).some(e => e.kind === MutationKind.Settings)
    if (pending) return false
    const local = await this.store.loadSettings()
    if (JSON.stringify(local) === JSON.stringify(remote)) return false
    await this.store.saveSettings(remote)
    return true
  }

  private merge(state: StateResponse): Promise<void> {
    const changes = { userWords: state.userWords, dayStats: state.dayStats, reviewLogs: state.reviewLogs ?? [], settings: state.settings }
    return this.run(async () => {
      await this.mergeChanges(changes)
      if ((await this.store.getCursor()) === OfflineStore.EPOCH) await this.store.setCursor(state.serverTime)
    })
  }

  private async handleFailure(error: unknown, entries: OutboxEntry[]): Promise<void> {
    const rejected = error instanceof ApiError && !error.isRetryable
    if (rejected) await this.dropPoison(entries)
    this.fail(error)
    this.scheduleRetry()
  }

  private async dropPoison(entries: OutboxEntry[]): Promise<void> {
    const bumped = await this.store.bumpAttempts(entries.map(e => e.seq as number))
    const dead = bumped.filter(e => e.attempts >= SyncPolicy.MAX_REJECTED_ATTEMPTS)
    await this.store.removeOutbox(dead.map(e => e.seq as number))
  }

  private scheduleRetry(): void {
    this.cancelRetry?.()
    this.failures++
    const delay = Math.min(SyncPolicy.BACKOFF_BASE_MS * 2 ** (this.failures - 1), SyncPolicy.BACKOFF_MAX_MS)
    this.cancelRetry = this.env.schedule(() => void this.flush(), delay)
  }

  private succeed(serverTime: string): void {
    this.failures = 0
    this.cancelRetry?.()
    this.cancelRetry = null
    this.patch({ online: true, lastSyncAt: serverTime, lastError: null })
  }

  private fail(error: unknown): void {
    const offline = error instanceof ApiError && error.isOffline
    const message = error instanceof Error ? error.message : String(error)
    this.patch({ lastError: message, ...(offline ? { online: false } : {}) })
  }

  private handleOnline(): void {
    this.patch({ online: true })
    void this.refresh()
  }

  private async refreshPending(): Promise<void> {
    this.patch({ pending: await this.store.pendingCount() })
  }

  private notifyMerged(): void {
    this.mergedListeners.forEach(l => l())
  }

  private patch(change: Partial<SyncStatus>): void {
    this.current = { ...this.current, ...change }
    this.statusListeners.forEach(l => l(this.current))
  }
}
