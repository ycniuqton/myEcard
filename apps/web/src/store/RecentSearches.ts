import type { OfflineStore } from '../api'
import { StoreConfig } from './StoreConfig'

/** Most-recent-first list of searches kept in IndexedDB. */
export class RecentSearches {
  constructor(private readonly store: OfflineStore) {}

  load(): Promise<string[]> {
    return this.store.getRecent()
  }

  async remember(query: string, current: string[]): Promise<string[]> {
    const q = query.trim().toLowerCase()
    if (!q) return current
    const next = [q, ...current.filter(x => x !== q)].slice(0, StoreConfig.RECENT_MAX)
    await this.store.setRecent(next)
    return next
  }

  async clear(): Promise<string[]> {
    await this.store.setRecent([])
    return []
  }
}
