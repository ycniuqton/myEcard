import type {
  DayStat, ExportSnapshot, Grade, PlacementSubmission, ReviewLog, SearchHit, SessionResponse, Settings, UserWord, Word,
} from '@wordmap/shared'
import type { ApiClient, OfflineStore, SyncEngine, SyncStatus } from '../api'
import type { ProgressView } from './ProgressView'
import type { SessionState } from './SessionModel'
import type { WordIndex } from './WordIndex'

export type StoreDeps = {
  api: ApiClient
  offline: OfflineStore
  engine: SyncEngine
  clock: () => Date
}

export type StoreData = {
  ready: boolean
  loadError: string | null
  contentVersion: string | null
  index: WordIndex
  words: Word[]
  byId: Map<string, Word>
  byRank: Map<number, Word>
  userWords: Map<string, UserWord>
  dayStats: DayStat[]
  reviewLogs: ReviewLog[]
  settings: Settings
  today: string
  progress: ProgressView
  plan: SessionResponse
  todayDone: boolean
  canLearnMore: boolean
  recentSearches: string[]
  sync: SyncStatus
  session: SessionState | null
}

export type StoreActions = {
  init: () => Promise<void>
  refresh: () => Promise<void>
  refreshToday: () => void
  startSession: () => void
  learnMore: () => void
  startWordReview: (wordId: string) => void
  know: () => Promise<void>
  learn: () => Promise<void>
  grade: (grade: Grade) => Promise<void>
  closeSession: () => void
  markKnown: (wordId: string) => Promise<void>
  startLearning: (wordId: string) => Promise<void>
  resetWord: (wordId: string) => Promise<void>
  submitPlacement: (submission: PlacementSubmission) => Promise<number>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  search: (query: string) => SearchHit[]
  rememberSearch: (query: string) => Promise<void>
  clearRecentSearches: () => Promise<void>
  exportData: () => Promise<ExportSnapshot>
  exportJson: () => Promise<string>
  importData: (snapshot: ExportSnapshot | string) => Promise<void>
  resetProgress: () => Promise<void>
}

export type AppState = StoreData & StoreActions
export type StoreSetter = (partial: Partial<AppState>) => void
export type StoreContext = { get: () => AppState; set: StoreSetter; deps: StoreDeps }
