export enum SessionItemKind {
  Review = 'review',
  New = 'new',
}

export enum NewWordAnswer {
  Know = 'know',
  Learn = 'learn',
}

export enum BandFilter {
  All = 'All',
  Unknown = 'Unknown',
  Learning = 'Learning',
  Known = 'Known',
}

/** Tunable numbers of the learning store. */
export class StoreConfig {
  static readonly LEARN_MORE_BATCH = 20
  static readonly SEARCH_LIMIT = 20
  static readonly RECENT_MAX = 6
  static readonly EXPORT_VERSION = 1
  static readonly NEXT_CHIPS = 5
  static readonly PERCENT = 100
  static readonly NO_MARKER = null
}
