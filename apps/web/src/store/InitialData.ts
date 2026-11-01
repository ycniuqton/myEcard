import { DefaultSettings } from '../api'
import { StateDeriver } from './ProgressView'
import type { StoreData, StoreDeps } from './StoreTypes'
import { WordIndex } from './WordIndex'

/** Builds the empty (signed-out or just-bound) store data. */
export class InitialData {
  static build(deps: StoreDeps): StoreData {
    const index = new WordIndex([])
    const settings = DefaultSettings.create()
    const derived = new StateDeriver().derive({ index, userWords: new Map(), dayStats: [], settings, now: deps.clock() })
    return {
      ready: false, loadError: null, contentVersion: null, index, words: index.words,
      byId: index.byId, byRank: index.byRank, userWords: new Map(), dayStats: [], reviewLogs: [],
      settings, recentSearches: [], sync: deps.engine.status(), session: null, ...derived,
    }
  }
}
