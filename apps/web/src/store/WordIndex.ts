import { Status, type SearchHit, type Word } from '@wordmap/shared'

export type StatusLookup = (wordId: string) => Status

/** Immutable lookup structures over the word list: by id, by rank, by band, plus local search. */
export class WordIndex {
  readonly byId = new Map<string, Word>()
  readonly byRank = new Map<number, Word>()
  readonly byBand = new Map<number, Word[]>()
  readonly sorted: Word[]

  constructor(readonly words: Word[]) {
    this.sorted = [...words].sort((a, b) => a.rank - b.rank)
    for (const w of this.sorted) this.add(w)
  }

  get total(): number {
    return this.words.length
  }

  search(query: string, limit: number, statusOf: StatusLookup): SearchHit[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const starts = this.sorted.filter(w => this.startsWith(w, q))
    const rest = this.sorted.filter(w => !this.startsWith(w, q) && w.lemma.toLowerCase().includes(q))
    return [...starts, ...rest].slice(0, limit).map(w => this.toHit(w, statusOf(w.id)))
  }

  private startsWith(w: Word, q: string): boolean {
    return w.lemma.toLowerCase().startsWith(q) || (w.forms ?? []).some(f => f.toLowerCase().startsWith(q))
  }

  private add(w: Word): void {
    this.byId.set(w.id, w)
    this.byRank.set(w.rank, w)
    const band = this.byBand.get(w.band) ?? []
    band.push(w)
    this.byBand.set(w.band, band)
  }

  private toHit(w: Word, status: Status): SearchHit {
    return { id: w.id, lemma: w.lemma, rank: w.rank, definition: w.definitions[0]?.text ?? '', status }
  }
}
