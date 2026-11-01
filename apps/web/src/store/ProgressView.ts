import {
  DateUtil, dueCounts, percentKnown, SessionPlanner, Status, streaks,
} from '@wordmap/shared'
import type { DayStat, SessionResponse, Settings, StatusCounts, StreakInfo, UserWord } from '@wordmap/shared'
import { StoreConfig } from './StoreConfig'
import type { WordIndex } from './WordIndex'

export type BandSummary = {
  band: number
  start: number
  end: number
  size: number
  known: number
  percent: number
  here: boolean
  counts: StatusCounts
}

export type ProgressView = {
  statusByRank: Status[]
  counts: StatusCounts
  percentKnown: number
  streak: StreakInfo
  bands: BandSummary[]
  markerRank: number | null
  dueToday: number
  dueTomorrow: number
}

export type DerivedState = {
  today: string
  progress: ProgressView
  plan: SessionResponse
  todayDone: boolean
  canLearnMore: boolean
}

export type DeriveInput = {
  index: WordIndex
  userWords: Map<string, UserWord>
  dayStats: DayStat[]
  settings: Settings
  now: Date
}

/** Derives status counts, band summaries, streak and today plan once per progress change. */
export class StateDeriver {
  constructor(private readonly planner = new SessionPlanner()) {}

  derive(input: DeriveInput): DerivedState {
    const today = DateUtil.iso(input.now)
    const rows = [...input.userWords.values()]
    const progress = this.progress(input, rows, today)
    const todayStat = input.dayStats.find(d => d.date === today)
    const plan = this.plan(input, rows, today, todayStat?.newLearned ?? 0)
    const todayDone = todayStat?.goalMet ?? false
    const canLearnMore = todayDone && progress.markerRank !== StoreConfig.NO_MARKER
    return { today, progress, plan, todayDone, canLearnMore }
  }

  private plan(input: DeriveInput, rows: UserWord[], today: string, doneNew: number): SessionResponse {
    return this.planner.plan({
      words: input.index.words, userWords: rows, today, dailyNew: input.settings.dailyNew, doneNew,
    })
  }

  private progress(input: DeriveInput, rows: UserWord[], today: string): ProgressView {
    const { index } = input
    const statusByRank: Status[] = []
    const counts = this.emptyCounts()
    const bands = new Map<number, BandSummary>()
    let markerRank: number | null = StoreConfig.NO_MARKER
    for (const w of index.sorted) {
      const status = input.userWords.get(w.id)?.status ?? Status.Unknown
      statusByRank[w.rank] = status
      counts[status]++
      this.tally(bands, w.band, w.rank, status)
      if (markerRank === StoreConfig.NO_MARKER && status === Status.Unknown) markerRank = w.rank
    }
    return {
      statusByRank, counts, percentKnown: percentKnown(counts, index.total),
      streak: streaks(input.dayStats, today), bands: this.finish(bands, markerRank),
      markerRank, ...dueCounts(rows, today),
    }
  }

  private tally(bands: Map<number, BandSummary>, band: number, rank: number, status: Status): void {
    const b = bands.get(band) ?? this.emptyBand(band, rank)
    b.end = Math.max(b.end, rank)
    b.start = Math.min(b.start, rank)
    b.size++
    b.counts[status]++
    bands.set(band, b)
  }

  private finish(bands: Map<number, BandSummary>, markerRank: number | null): BandSummary[] {
    return [...bands.values()].sort((a, b) => a.band - b.band).map(b => {
      const known = b.counts[Status.Known] + b.counts[Status.Mastered]
      const here = markerRank !== StoreConfig.NO_MARKER && markerRank >= b.start && markerRank <= b.end
      return { ...b, known, here, percent: Math.round((known / b.size) * StoreConfig.PERCENT) }
    })
  }

  private emptyBand(band: number, rank: number): BandSummary {
    return { band, start: rank, end: rank, size: 0, known: 0, percent: 0, here: false, counts: this.emptyCounts() }
  }

  private emptyCounts(): StatusCounts {
    return { [Status.Unknown]: 0, [Status.Learning]: 0, [Status.Known]: 0, [Status.Mastered]: 0 }
  }
}
