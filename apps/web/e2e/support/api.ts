import { expect, type APIRequestContext } from '@playwright/test'

export const Endpoint = {
  State: '/api/state',
  Settings: '/api/settings',
  Import: '/api/import',
  Export: '/api/export',
  Progress: '/api/progress',
  Stats: '/api/stats',
  Words: '/api/content/words',
} as const

export const StatusValue = { Unknown: 'unknown', Learning: 'learning', Known: 'known', Mastered: 'mastered' } as const
export type StatusName = (typeof StatusValue)[keyof typeof StatusValue]

const CORE_COUNT = 2809
const EXTENDED_PREFIX = 'ext:'
export const DAY_MS = 86_400_000
const SNAPSHOT_VERSION = 1
const DEFAULT_EASE = 2.5
const DEFAULT_DAILY = 5
const NOON_HOUR = 12
const SECOND_MS = 1000
const SEED_LOG_RANK = 1
const SYNC_TIMEOUT_MS = 15_000

export type SeedWord = { rank: number; status: StatusName; dueInDays?: number; interval?: number; assumed?: boolean }
export type SeedDay = { daysAgo: number; newLearned: number; reviewed: number; goalMet: boolean }
export type SeedOptions = {
  placementDone?: boolean
  dailyNew?: number
  words?: SeedWord[]
  days?: SeedDay[]
}

export type ApiUserWord = { wordId: string; status: string; due: string | null; interval: number; reps: number; lapses: number }
export type ApiState = {
  settings: { dailyNew: number; theme: string; voice: string; placementDone: boolean; reminderTime?: string; learnerName?: string }
  userWords: ApiUserWord[]
  dayStats: { date: string; newLearned: number; reviewed: number; goalMet: boolean }[]
}

/** Local calendar date (YYYY-MM-DD) shifted by whole days, matching the browser's notion of today. */
export function localDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * DAY_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function wordId(rank: number): string {
  if (rank > CORE_COUNT) return `${EXTENDED_PREFIX}${rank}`
  return `ngsl:${String(rank).padStart(4, '0')}`
}

/** Thin client over the real API used to seed and inspect server state. */
export class TestApi {
  constructor(private readonly http: APIRequestContext) {}

  async state(): Promise<ApiState> {
    const res = await this.http.get(Endpoint.State)
    return (await res.json()) as ApiState
  }

  async waitFor(describe: string, check: (state: ApiState) => boolean): Promise<ApiState> {
    await expect.poll(async () => check(await this.state()), { message: describe, timeout: SYNC_TIMEOUT_MS }).toBe(true)
    return this.state()
  }

  async wordRanks(): Promise<Map<string, number>> {
    const res = await this.http.get(Endpoint.Words)
    const body = (await res.json()) as { words: { lemma: string; rank: number }[] }
    return new Map(body.words.map(w => [w.lemma, w.rank]))
  }

  async totalWords(): Promise<number> {
    const res = await this.http.get(Endpoint.Words)
    return ((await res.json()) as { words: unknown[] }).words.length
  }

  async stats(): Promise<Record<string, any>> {
    const res = await this.http.get(Endpoint.Stats)
    return (await res.json()) as Record<string, any>
  }

  async exportSnapshot(): Promise<Record<string, any>> {
    const res = await this.http.get(Endpoint.Export)
    return (await res.json()) as Record<string, any>
  }

  async reset(): Promise<void> {
    const res = await this.http.delete(Endpoint.Progress)
    if (!res.ok()) throw new Error(`reset failed ${res.status()}`)
  }

  async seed(options: SeedOptions = {}): Promise<void> {
    const now = new Date().toISOString()
    const snapshot = {
      version: SNAPSHOT_VERSION,
      exportedAt: now,
      settings: {
        dailyNew: options.dailyNew ?? DEFAULT_DAILY,
        theme: 'light',
        voice: 'us',
        activeListId: 'ngsl',
        placementDone: options.placementDone ?? true,
      },
      userWords: (options.words ?? []).map(w => this.userWord(w, now)),
      reviewLogs: (options.days ?? []).flatMap(d => this.logsFor(d)),
      dayStats: (options.days ?? []).map(d => ({
        date: localDate(-d.daysAgo),
        newLearned: d.newLearned,
        reviewed: d.reviewed,
        goalMet: d.goalMet,
      })),
    }
    const res = await this.http.post(Endpoint.Import, { data: snapshot })
    if (!res.ok()) throw new Error(`seed failed ${res.status()} ${await res.text()}`)
  }

  private logsFor(day: SeedDay) {
    const noon = new Date()
    noon.setHours(NOON_HOUR, 0, 0, 0)
    const at = new Date(noon.getTime() - day.daysAgo * DAY_MS)
    return Array.from({ length: day.reviewed }, (_, i) => ({
      id: `seed-${day.daysAgo}-${i}`,
      wordId: wordId(SEED_LOG_RANK),
      at: new Date(at.getTime() + i * SECOND_MS).toISOString(),
      mode: 'flashcard',
      grade: 'good',
    }))
  }

  private userWord(w: SeedWord, now: string) {
    const due = localDate(w.dueInDays ?? 1)
    return {
      wordId: wordId(w.rank),
      status: w.status,
      assumed: w.assumed ?? false,
      ease: DEFAULT_EASE,
      interval: w.interval ?? 1,
      reps: w.status === StatusValue.Learning ? 1 : 3,
      lapses: 0,
      due,
      firstSeenAt: now,
      updatedAt: now,
    }
  }
}

