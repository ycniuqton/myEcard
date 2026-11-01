import type { Cefr, ErrorCode, ExampleSource, Grade, KnowAnswer, ListId, ReviewMode, Status, Theme, Voice } from './enums'

export type Definition = { pos: string; text: string }
export type Example = { text: string; source: ExampleSource; sourceId?: string }

export type Word = {
  id: string
  lemma: string
  rank: number
  band: number
  pos: string[]
  ipa?: string
  definitions: Definition[]
  vi?: string
  examples: Example[]
  forms?: string[]
  cefr?: Cefr
  listIds: string[]
  imageUrl?: string
}

export type WordList = { id: ListId | string; name: string; source: string; license: string; wordIds: string[] }

export type Credit = { name: string; license: string; url: string; note?: string }

export type UserWord = {
  wordId: string
  status: Status
  assumed: boolean
  ease: number
  interval: number
  reps: number
  lapses: number
  due: string | null
  firstSeenAt?: string
  updatedAt: string
}

export type ReviewGrade = Grade | KnowAnswer

export type ReviewLog = {
  id: string
  wordId: string
  at: string
  mode: ReviewMode
  grade: ReviewGrade
  msTaken?: number
}

export type Settings = {
  dailyNew: number
  reminderTime?: string
  theme: Theme
  voice: Voice
  activeListId: string
  placementDone: boolean
  learnerName?: string
}

export type DayStat = { date: string; newLearned: number; reviewed: number; goalMet: boolean }

export type BandAnswer = { wordId: string; known: boolean }
export type ProbeResult = { band: number; answers: BandAnswer[] }
export type PlacementSubmission = { level: number; tappedKnownIds: string[]; probes: ProbeResult[] }

export type StatusCounts = Record<Status, number>
export type StreakInfo = { current: number; best: number }
export type KnownPoint = { date: string; total: number }
export type ReviewDayPoint = { date: string; count: number }

export type ApiErrorBody = { error: { code: ErrorCode; message: string } }
export type HealthResponse = { ok: boolean; contentVersion: string }
export type WordsResponse = { contentVersion: string; words: Word[] }
export type CreditsResponse = Credit[]

export type SearchHit = { id: string; lemma: string; rank: number; definition: string; status: Status }
export type SearchQuery = { q: string; limit?: number }
export type SearchResponse = { hits: SearchHit[] }

export type StateResponse = {
  settings: Settings
  userWords: UserWord[]
  dayStats: DayStat[]
  reviewLogs: ReviewLog[]
  serverTime: string
}
export type SettingsUpdateRequest = Partial<Settings>
export type SettingsResponse = Settings

export type PlacementResponse = { knownCount: number; state: StateResponse }

export type WordActionResponse = UserWord | null

export type ReviewRequest = { wordId: string; grade: Grade; at: string; msTaken?: number; clientId: string }
export type ReviewResponse = { userWord: UserWord; dayStat: DayStat }

export type SessionQuery = { date: string }
export type SessionResponse = { due: string[]; fresh: string[]; doneNew: number; goalNew: number }
export type DayUpdateRequest = { date: string; newLearned?: number; reviewed?: number; goalMet?: boolean }
export type DayUpdateResponse = DayStat

export type StatsQuery = { date?: string }
export type StatsResponse = {
  counts: StatusCounts
  percentKnown: number
  streak: StreakInfo
  dueToday: number
  dueTomorrow: number
  knownOverTime: KnownPoint[]
  reviewsPerDay: ReviewDayPoint[]
}

export type SyncChanges = {
  userWords: UserWord[]
  reviewLogs: ReviewLog[]
  dayStats: DayStat[]
  settings?: Settings
  settingsUpdatedAt?: string
}
export type SyncPayload = { since: string; changes: SyncChanges }
export type SyncResponse = { serverChanges: SyncChanges; serverTime: string }

export type ExportSnapshot = {
  version: number
  exportedAt: string
  settings: Settings
  userWords: UserWord[]
  reviewLogs: ReviewLog[]
  dayStats: DayStat[]
}
export type ImportRequest = ExportSnapshot
