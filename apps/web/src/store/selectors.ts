import { Status, type KnownPoint, type ReviewDayPoint, type Word, knownOverTime, reviewsPerDay } from '@wordmap/shared'
import type { BandSummary } from './ProgressView'
import type { SessionItem } from './SessionModel'
import { BandFilter, StoreConfig } from './StoreConfig'
import type { AppState } from './StoreTypes'

export type BandTile = { rank: number; wordId: string; status: Status; isMarker: boolean }
export type BandRow = { rank: number; wordId: string; lemma: string; short: string; status: Status }
export type WordView = { word: Word; status: Status; userWordDue: string | null }
export type CurrentCard = { item: SessionItem; word: Word; status: Status }

/** Pure read helpers over AppState; wrap array-returning ones in useMemo or useShallow. */
export class Selectors {
  private static readonly KNOWN_STATUSES: ReadonlySet<Status> = new Set([Status.Known, Status.Mastered])

  static statusOfRank(s: AppState, rank: number): Status {
    return s.progress.statusByRank[rank] ?? Status.Unknown
  }

  static bandSummary(s: AppState, band: number): BandSummary | null {
    return s.progress.bands.find(b => b.band === band) ?? null
  }

  static bandTiles(s: AppState, band: number): BandTile[] {
    const words = s.index.byBand.get(band) ?? []
    return words.map(w => ({
      rank: w.rank, wordId: w.id, status: Selectors.statusOfRank(s, w.rank), isMarker: w.rank === s.progress.markerRank,
    }))
  }

  static bandRows(s: AppState, band: number, filter: BandFilter = BandFilter.All): BandRow[] {
    const words = s.index.byBand.get(band) ?? []
    return words
      .map(w => ({ w, status: Selectors.statusOfRank(s, w.rank) }))
      .filter(x => Selectors.matches(filter, x.status))
      .map(({ w, status }) => ({
        rank: w.rank, wordId: w.id, lemma: w.lemma, status, short: w.definitions[0]?.text ?? w.pos.join(', '),
      }))
  }

  static nextWords(s: AppState, count: number = StoreConfig.NEXT_CHIPS): Word[] {
    return s.index.sorted.filter(w => Selectors.statusOfRank(s, w.rank) === Status.Unknown).slice(0, count)
  }

  static wordView(s: AppState, rank: number): WordView | null {
    const word = s.byRank.get(rank)
    if (!word) return null
    return { word, status: Selectors.statusOfRank(s, rank), userWordDue: s.userWords.get(word.id)?.due ?? null }
  }

  static currentCard(s: AppState): CurrentCard | null {
    const session = s.session
    const item = session && !session.summary ? session.queue[session.index] : null
    const word = item ? s.byId.get(item.wordId) : null
    return item && word ? { item, word, status: Selectors.statusOfRank(s, word.rank) } : null
  }

  static knownOverTime(s: AppState): KnownPoint[] {
    return knownOverTime(s.reviewLogs)
  }

  static reviewsPerDay(s: AppState): ReviewDayPoint[] {
    return reviewsPerDay(s.reviewLogs, s.today)
  }

  static knownCount(s: AppState): number {
    return s.progress.counts[Status.Known] + s.progress.counts[Status.Mastered]
  }

  static isKnown(status: Status): boolean {
    return Selectors.KNOWN_STATUSES.has(status)
  }

  private static matches(filter: BandFilter, status: Status): boolean {
    if (filter === BandFilter.All) return true
    if (filter === BandFilter.Unknown) return status === Status.Unknown
    if (filter === BandFilter.Learning) return status === Status.Learning
    return Selectors.KNOWN_STATUSES.has(status)
  }
}

export const statusOfRank = Selectors.statusOfRank
export const selectBandSummary = Selectors.bandSummary
export const selectBandTiles = Selectors.bandTiles
export const selectBandRows = Selectors.bandRows
export const selectNextWords = Selectors.nextWords
export const selectWordView = Selectors.wordView
export const selectCurrentCard = Selectors.currentCard
export const selectKnownOverTime = Selectors.knownOverTime
export const selectReviewsPerDay = Selectors.reviewsPerDay
export const selectKnownCount = Selectors.knownCount
