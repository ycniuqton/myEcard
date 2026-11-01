/**
 * WordMap store API (zustand). Usage: const x = useAppStore(s => s.field); const act = useAppStore(s => s.action)
 *
 * BOOT: call useAppStore.getState().init() once (renders from IndexedDB at once, refreshes from the API in background).
 *
 * DATA (read via useAppStore(s => s.x))
 *   ready, loadError            ready=true once words are loaded; loadError=string when first load failed (no cache, offline)
 *   words: Word[]               sorted by rank | byId: Map<string,Word> | byRank: Map<number,Word> | index: WordIndex (byBand map)
 *   userWords: Map<wordId,UserWord> | dayStats: DayStat[] | reviewLogs: ReviewLog[] | contentVersion
 *   settings: {dailyNew, reminderTime?, theme, voice, activeListId, placementDone}
 *   today: 'YYYY-MM-DD'
 *   progress: { statusByRank: Status[] (index = rank), counts: Record<Status,number>, percentKnown: number (0-100),
 *               streak: {current,best}, bands: BandSummary[], markerRank: number|null (first unknown = "you are here"),
 *               dueToday, dueTomorrow }
 *     BandSummary = { band, start, end, size, known, percent, here, counts: Record<Status,number> }
 *   plan: { due: wordId[], fresh: wordId[], doneNew, goalNew }   today's session plan (SessionPlanner)
 *   todayDone: boolean (day goal met -> Today done state; flame filled) | canLearnMore: boolean
 *   recentSearches: string[] (most recent first, persisted) | sync: {online, pending, syncing, lastSyncAt, lastError}
 *   session: null | { queue: SessionItem[], index, log, summary: SessionSummary|null, streakBefore, itemShownAt }
 *     SessionItem = { kind: 'review'|'new', wordId, rank, requeued }
 *     SessionSummary = { reviewed, newLearned, known, accuracy: number|null, streak, streakIncreased, newWordIds }
 *     session.summary !== null means finished -> show Summary; queue.length===0 -> summary with zeros
 *
 * ACTIONS
 *   init(), refresh(), refreshToday()           refreshToday re-derives after midnight / on visibility
 *   startSession()                              due reviews first, then fresh new words (design order)
 *   startWordReview(wordId)                     one-card review session for a single word (word-detail Review now)
 *   learnMore()                                 session of LEARN_MORE_BATCH (20), repeatable extra new words
 *   know() / learn()                            answer current NEW card (Know = assumed known, Learn = learning, due today)
 *   grade(Grade)                                answer current REVIEW card; Again re-queues the card at the end once more
 *   closeSession()                              clears session (go back to Today / Map)
 *   markKnown(id) / startLearning(id) / resetWord(id)   word-detail actions
 *   submitPlacement(PlacementSubmission) -> Promise<knownCount>   offline: assumed-known rows (due spread over 30+ days) for words
 *                                               up to level-100 plus tapped ids, stale assumed rows reset, submission queued in the outbox
 *                                               and posted to /placement on sync, settings.placementDone=true
 *   updateSettings(Partial<Settings>)           dailyNew, theme, voice, reminderTime, placementDone
 *   search(query) -> SearchHit[] (sync, local, prefix then contains, max 20) | rememberSearch(q) | clearRecentSearches()
 *   exportData() / exportJson() / importData(snapshot|json) / resetProgress()   import+reset need the server (throw ApiError offline)
 *   bindDatabase(name|null) / unbindDatabase(wipe) / flushPending()   per-account db switching (see auth/); mode none binds the legacy db
 *
 * SELECTORS (functions of state; wrap array results in useMemo or useShallow)
 *   statusOfRank(s, rank) -> Status | selectBandSummary(s, band) | selectBandTiles(s, band) -> {rank,wordId,status,isMarker}[]
 *   selectBandRows(s, band, BandFilter) -> {rank,wordId,lemma,short,status}[] | selectNextWords(s, n=5) -> Word[]
 *   selectWordView(s, rank) -> {word,status,userWordDue}|null | selectCurrentCard(s) -> {item,word,status}|null
 *   selectKnownOverTime(s) | selectReviewsPerDay(s) | selectKnownCount(s)
 *   Enums: BandFilter (All/Unknown/Learning/Known), SessionItemKind (Review/New), NewWordAnswer, Status/Grade from @wordmap/shared
 */
import { create } from 'zustand'
import { ApiClient, OfflineStore, SyncEngine } from '../api'
import { AuthConfig } from '../auth/AuthConfig'
import { AuthRuntime } from '../auth/AuthRuntime'
import { AppController } from './AppController'
import { DataController } from './DataController'
import { InitialData } from './InitialData'
import { SessionController } from './SessionController'
import type { AppState, StoreActions, StoreContext, StoreDeps } from './StoreTypes'
import { UserBinder } from './UserBinder'

export * from './StoreTypes'
export * from './StoreConfig'
export * from './selectors'
export * from './SessionModel'
export type { BandSummary, ProgressView } from './ProgressView'
export { WordIndex } from './WordIndex'

/** Builds the default dependencies (real API, IndexedDB, browser sync). */
export class StoreDepsFactory {
  static create(): StoreDeps {
    const api = new ApiClient({ auth: AuthRuntime.tokenProvider() })
    const offline = new OfflineStore(AuthConfig.usesAuth() ? null : AuthConfig.LEGACY_DB)
    const clock = () => new Date()
    return { api, offline, clock, engine: new SyncEngine({ store: offline, api, clock }) }
  }
}

class ActionBinder {
  static bind(ctx: StoreContext): StoreActions {
    const app = new AppController(ctx)
    const session = new SessionController(ctx)
    const data = new DataController(ctx)
    const binder = new UserBinder(ctx, app)
    return {
      init: () => app.init(), refresh: () => app.refresh(), refreshToday: () => app.refreshToday(),
      startSession: () => session.start(), learnMore: () => session.learnMore(), startWordReview: id => session.startWord(id),
      know: () => session.know(), learn: () => session.learn(), grade: g => session.grade(g),
      closeSession: () => session.close(),
      markKnown: id => app.markKnown(id), startLearning: id => app.startLearning(id), resetWord: id => app.resetWord(id),
      submitPlacement: r => app.submitPlacement(r), updateSettings: p => app.updateSettings(p),
      search: q => app.search(q), rememberSearch: q => app.rememberSearch(q), clearRecentSearches: () => app.clearRecentSearches(),
      exportData: () => data.exportData(), exportJson: () => data.exportJson(),
      importData: i => data.importData(i), resetProgress: () => data.resetProgress(),
      bindDatabase: n => binder.bind(n), unbindDatabase: w => binder.unbind(w), flushPending: () => binder.flushPending(),
    }
  }
}

/** Creates an isolated store; tests inject fakes, the app uses useAppStore. */
export function createAppStore(deps: StoreDeps) {
  return create<AppState>()((set, get) => ({
    ...InitialData.build(deps),
    ...ActionBinder.bind({ get, set, deps }),
  }))
}

export const useAppStore = createAppStore(StoreDepsFactory.create())
