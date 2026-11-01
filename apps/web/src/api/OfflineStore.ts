import Dexie, { type Table } from 'dexie'
import { ListId, Theme, Voice } from '@wordmap/shared'
import type { DayStat, ExportSnapshot, ReviewLog, Settings, UserWord, Word } from '@wordmap/shared'

export enum MutationKind {
  Word = 'word',
  Review = 'review',
  Day = 'day',
  Settings = 'settings',
  Placement = 'placement',
}

export enum KvKey {
  Settings = 'settings',
  SyncCursor = 'syncCursor',
  RecentSearches = 'recentSearches',
}

export type OutboxEntry = {
  seq?: number
  clientId: string
  kind: MutationKind
  refId: string
  createdAt: string
  attempts: number
  payload?: unknown
}

export type WordCacheRow = { contentVersion: string; words: Word[]; savedAt: string }
export type KvRow = { key: string; value: unknown }
export type ProgressSnapshot = { settings: Settings | null; userWords: UserWord[]; dayStats: DayStat[]; reviewLogs: ReviewLog[] }

/** Settings used before the server has ever answered. */
export class DefaultSettings {
  static readonly DAILY_NEW = 5

  static create(): Settings {
    return {
      dailyNew: DefaultSettings.DAILY_NEW,
      theme: Theme.System,
      voice: Voice.Us,
      activeListId: ListId.Ngsl,
      placementDone: false,
    }
  }
}

class WordMapDb extends Dexie {
  wordCache!: Table<WordCacheRow, string>
  userWords!: Table<UserWord, string>
  dayStats!: Table<DayStat, string>
  reviewLogs!: Table<ReviewLog, string>
  kv!: Table<KvRow, string>
  outbox!: Table<OutboxEntry, number>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      wordCache: 'contentVersion',
      userWords: 'wordId,due',
      dayStats: 'date',
      reviewLogs: 'id,wordId',
      kv: 'key',
      outbox: '++seq,&clientId',
    })
  }
}

/** IndexedDB cache: words by content version, progress rows, settings, outbox and sync cursor. */
export class OfflineStore {
  static readonly DB_NAME = 'wordmap'
  static readonly UNBOUND = 'Offline store has no open database (not signed in)'
  static readonly EPOCH = '1970-01-01T00:00:00.000Z'
  private current: WordMapDb | null
  private currentName: string | null

  /** Pass null to stay unbound until use(name) is called (accounts open their db after sign-in). */
  constructor(name: string | null = OfflineStore.DB_NAME) {
    this.currentName = name
    this.current = name === null ? null : new WordMapDb(name)
  }

  get name(): string | null {
    return this.currentName
  }

  use(name: string): void {
    if (name === this.currentName && this.current) return
    this.current?.close()
    this.currentName = name
    this.current = new WordMapDb(name)
  }

  close(): void {
    this.current?.close()
    this.current = null
    this.currentName = null
  }

  async destroy(): Promise<void> {
    const db = this.current
    this.current = null
    this.currentName = null
    await db?.delete()
  }

  private get db(): WordMapDb {
    if (!this.current) throw new Error(OfflineStore.UNBOUND)
    return this.current
  }

  async loadWords(): Promise<WordCacheRow | null> {
    const rows = await this.db.wordCache.toArray()
    rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    return rows[0] ?? null
  }

  async saveWords(contentVersion: string, words: Word[], now: Date): Promise<void> {
    await this.db.transaction('rw', this.db.wordCache, async () => {
      await this.db.wordCache.clear()
      await this.db.wordCache.put({ contentVersion, words, savedAt: now.toISOString() })
    })
  }

  async loadProgress(): Promise<ProgressSnapshot> {
    const [settings, userWords, dayStats, reviewLogs] = await Promise.all([
      this.loadSettings(), this.db.userWords.toArray(), this.db.dayStats.toArray(), this.db.reviewLogs.toArray(),
    ])
    return { settings, userWords, dayStats, reviewLogs }
  }

  async replaceProgress(snapshot: ProgressSnapshot): Promise<void> {
    const { db } = this
    await db.transaction('rw', [db.userWords, db.dayStats, db.reviewLogs, db.kv, db.outbox], async () => {
      await Promise.all([db.userWords.clear(), db.dayStats.clear(), db.reviewLogs.clear(), db.outbox.clear()])
      await db.userWords.bulkPut(snapshot.userWords)
      await db.dayStats.bulkPut(snapshot.dayStats)
      await db.reviewLogs.bulkPut(snapshot.reviewLogs)
      if (snapshot.settings) await this.setKv(KvKey.Settings, snapshot.settings)
    })
  }

  async toExport(version: number, now: Date): Promise<ExportSnapshot> {
    const p = await this.loadProgress()
    return {
      version, exportedAt: now.toISOString(), settings: p.settings ?? DefaultSettings.create(),
      userWords: p.userWords, reviewLogs: p.reviewLogs, dayStats: p.dayStats,
    }
  }

  getUserWord = (wordId: string) => this.db.userWords.get(wordId)
  getUserWords = (ids: string[]) => this.db.userWords.bulkGet(ids)
  putUserWords = (rows: UserWord[]) => this.db.userWords.bulkPut(rows)
  getDayStat = (date: string) => this.db.dayStats.get(date)
  getDayStats = (dates: string[]) => this.db.dayStats.bulkGet(dates)
  putDayStats = (rows: DayStat[]) => this.db.dayStats.bulkPut(rows)
  putReviewLogs = (rows: ReviewLog[]) => this.db.reviewLogs.bulkPut(rows)
  getReviewLogs = (ids: string[]) => this.db.reviewLogs.bulkGet(ids)

  async countDue(today: string, unknownStatus: string): Promise<number> {
    return this.db.userWords.where('due').belowOrEqual(today).filter(u => u.status !== unknownStatus).count()
  }

  async loadSettings(): Promise<Settings | null> {
    return ((await this.getKv(KvKey.Settings)) as Settings | undefined) ?? null
  }

  saveSettings = (settings: Settings) => this.setKv(KvKey.Settings, settings)

  async getCursor(): Promise<string> {
    return ((await this.getKv(KvKey.SyncCursor)) as string | undefined) ?? OfflineStore.EPOCH
  }

  setCursor = (cursor: string) => this.setKv(KvKey.SyncCursor, cursor)

  async getRecent(): Promise<string[]> {
    return ((await this.getKv(KvKey.RecentSearches)) as string[] | undefined) ?? []
  }

  setRecent = (items: string[]) => this.setKv(KvKey.RecentSearches, items)

  async enqueue(entry: OutboxEntry): Promise<boolean> {
    const exists = await this.db.outbox.where('clientId').equals(entry.clientId).count()
    if (exists) return false
    await this.db.outbox.add(entry)
    return true
  }

  pending = () => this.db.outbox.orderBy('seq').toArray()
  pendingCount = () => this.db.outbox.count()
  removeOutbox = (seqs: number[]) => this.db.outbox.bulkDelete(seqs)

  async bumpAttempts(seqs: number[]): Promise<OutboxEntry[]> {
    const rows = (await this.db.outbox.bulkGet(seqs)).filter((r): r is OutboxEntry => !!r)
    const next = rows.map(r => ({ ...r, attempts: r.attempts + 1 }))
    await this.db.outbox.bulkPut(next)
    return next
  }

  private async getKv(key: KvKey): Promise<unknown> {
    return (await this.db.kv.get(key))?.value
  }

  private setKv(key: KvKey, value: unknown): Promise<unknown> {
    return this.db.kv.put({ key, value })
  }
}
