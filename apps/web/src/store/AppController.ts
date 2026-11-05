import { AdaptivePlacementEngine, Status, type PlacementSubmission, type SearchHit, type Settings, type Word } from '@wordmap/shared'
import { ApiError, WordAction, type MutationResult, type ProgressSnapshot } from '../api'
import { BaseController } from './BaseController'
import { RecentSearches } from './RecentSearches'
import { StoreConfig } from './StoreConfig'
import { MeaningLanguage, MeaningLanguageStore } from '../features/common/MeaningLanguage'
import { WordIndex } from './WordIndex'
import type { StoreContext } from './StoreTypes'

/** Hydration, background refresh, word actions, placement, settings, search and recents. */
export class AppController extends BaseController {
  private readonly recents: RecentSearches
  private readonly placement = AdaptivePlacementEngine.shared
  private started = false
  private unsubscribes: Array<() => void> = []

  constructor(ctx: StoreContext) {
    super(ctx)
    this.recents = new RecentSearches(ctx.deps.offline)
  }

  async init(): Promise<void> {
    const { offline } = this.deps
    const [cached, progress, recent] = await Promise.all([offline.loadWords(), offline.loadProgress(), this.recents.load()])
    if (cached) this.hydrate(cached.contentVersion, cached.words, progress, recent)
    else await this.loadFirstContent(progress, recent)
    this.wire()
    void this.refresh()
  }

  async refresh(): Promise<void> {
    await this.ensureContent()
    if (this.started) await this.deps.engine.refresh()
    else {
      this.started = true
      await this.deps.engine.start()
    }
  }

  refreshToday(): void {
    this.applyRows({})
  }

  async markKnown(wordId: string): Promise<void> {
    await this.wordAction(wordId, WordAction.Know)
  }

  async startLearning(wordId: string): Promise<void> {
    await this.wordAction(wordId, WordAction.Learn)
  }

  async resetWord(wordId: string): Promise<void> {
    await this.wordAction(wordId, WordAction.Reset)
  }

  async submitPlacement(submission: PlacementSubmission): Promise<number> {
    const ids = this.placement.knownIdsForLevel(this.state.words, submission.level, submission.tappedKnownIds)
    const assumed = ids.flatMap(id => this.assumedWord(id))
    const stale = this.staleAssumedIds()
    const rows = await this.deps.engine.recordPlacement(submission, assumed, stale)
    const settings = await this.deps.engine.recordSettings({ placementDone: true })
    this.ctx.set({ settings })
    this.applyRows({ userWords: rows })
    return assumed.length
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    await this.deps.engine.whenHydrated()
    const optimistic = { ...this.state.settings, ...patch }
    this.ctx.set({ settings: optimistic, ...this.derive(this.state.userWords, this.state.dayStats, { settings: optimistic }) })
    const saved = await this.deps.engine.recordSettings(patch)
    this.ctx.set({ settings: saved, ...this.derive(this.state.userWords, this.state.dayStats, { settings: saved }) })
  }

  search(query: string): SearchHit[] {
    const statusOf = (id: string) => this.state.userWords.get(id)?.status ?? Status.Unknown
    const withVi = MeaningLanguageStore.get() === MeaningLanguage.Both
    return this.state.index.search(query, StoreConfig.SEARCH_LIMIT, statusOf, withVi)
  }

  async rememberSearch(query: string): Promise<void> {
    this.ctx.set({ recentSearches: await this.recents.remember(query, this.state.recentSearches) })
  }

  async clearRecentSearches(): Promise<void> {
    this.ctx.set({ recentSearches: await this.recents.clear() })
  }

  dispose(): void {
    this.unsubscribes.forEach(u => u())
    this.unsubscribes = []
    this.started = false
    this.deps.engine.stop()
  }

  private assumedWord(wordId: string): Array<{ wordId: string; rank: number }> {
    const word = this.state.byId.get(wordId)
    return word ? [{ wordId, rank: word.rank }] : []
  }

  private staleAssumedIds(): string[] {
    return [...this.state.userWords.values()].filter(u => u.assumed && u.status === Status.Known).map(u => u.wordId)
  }

  private async wordAction(wordId: string, action: WordAction): Promise<void> {
    const result: MutationResult = await this.deps.engine.recordWordAction(wordId, action)
    this.applyRows({ userWords: [result.userWord], dayStats: [result.dayStat] })
  }

  private wire(): void {
    const { engine } = this.deps
    this.ctx.set({ sync: engine.status() })
    this.unsubscribes.push(
      engine.subscribe(sync => this.ctx.set({ sync })),
      engine.onMerged(() => void this.reloadProgress()),
    )
  }

  private hydrate(version: string, words: Word[], progress: ProgressSnapshot, recent: string[]): void {
    const index = new WordIndex(words)
    this.ctx.set({
      index, words: index.words, byId: index.byId, byRank: index.byRank,
      contentVersion: version, recentSearches: recent, ready: true, loadError: null,
    })
    this.applySnapshot(progress)
  }

  private async loadFirstContent(progress: ProgressSnapshot, recent: string[]): Promise<void> {
    try {
      const res = await this.deps.api.words()
      await this.deps.offline.saveWords(res.contentVersion, res.words, this.deps.clock())
      this.hydrate(res.contentVersion, res.words, progress, recent)
    } catch (error) {
      this.ctx.set({ loadError: error instanceof Error ? error.message : String(error), recentSearches: recent })
    }
  }

  private async ensureContent(): Promise<void> {
    try {
      const health = await this.deps.api.health()
      if (health.contentVersion === this.state.contentVersion) return
      const res = await this.deps.api.words()
      await this.deps.offline.saveWords(res.contentVersion, res.words, this.deps.clock())
      const progress = await this.deps.offline.loadProgress()
      this.hydrate(res.contentVersion, res.words, progress, this.state.recentSearches)
    } catch (error) {
      const offline = error instanceof ApiError && error.isOffline
      if (!offline && !this.state.ready) this.ctx.set({ loadError: String(error) })
    }
  }
}
