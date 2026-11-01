import type { DayStat, ReviewLog, Settings, UserWord } from '@wordmap/shared'
import { DefaultSettings, type ProgressSnapshot } from '../api'
import { StateDeriver } from './ProgressView'
import type { AppState, StoreContext, StoreDeps } from './StoreTypes'
import type { WordIndex } from './WordIndex'

export type RowChanges = { userWords?: UserWord[]; dayStats?: DayStat[]; reviewLogs?: ReviewLog[] }
export type DeriveOverride = { index?: WordIndex; settings?: Settings }

/** Shared state plumbing for store controllers: apply rows then re-derive progress once. */
export abstract class BaseController {
  protected readonly deriver = new StateDeriver()

  constructor(protected readonly ctx: StoreContext) {}

  protected get state(): AppState {
    return this.ctx.get()
  }

  protected get deps(): StoreDeps {
    return this.ctx.deps
  }

  protected applyRows(changes: RowChanges): void {
    const userWords = new Map(this.state.userWords)
    for (const row of changes.userWords ?? []) userWords.set(row.wordId, row)
    const dayStats = this.mergeDays(this.state.dayStats, changes.dayStats ?? [])
    const reviewLogs = [...this.state.reviewLogs, ...(changes.reviewLogs ?? [])]
    this.ctx.set({ userWords, dayStats, reviewLogs, ...this.derive(userWords, dayStats) })
  }

  protected derive(userWords: Map<string, UserWord>, dayStats: DayStat[], over: DeriveOverride = {}) {
    return this.deriver.derive({
      index: over.index ?? this.state.index,
      settings: over.settings ?? this.state.settings,
      userWords, dayStats, now: this.deps.clock(),
    })
  }

  protected async reloadProgress(): Promise<void> {
    this.applySnapshot(await this.deps.offline.loadProgress())
  }

  protected applySnapshot(snapshot: ProgressSnapshot): void {
    const userWords = new Map(snapshot.userWords.map(u => [u.wordId, u]))
    const settings = snapshot.settings ?? DefaultSettings.create()
    this.ctx.set({
      userWords, settings, dayStats: snapshot.dayStats, reviewLogs: snapshot.reviewLogs,
      ...this.derive(userWords, snapshot.dayStats, { settings }),
    })
  }

  private mergeDays(current: DayStat[], incoming: DayStat[]): DayStat[] {
    const byDate = new Map(current.map(d => [d.date, d]))
    for (const d of incoming) byDate.set(d.date, d)
    return [...byDate.values()]
  }
}
