import { Status, type SearchHit, type Word } from '@wordmap/shared'

export type StatusLookup = (wordId: string) => Status

/** Lower-cases and strips Vietnamese diacritics so queries match with or without accents. */
export class TextFold {
  private static readonly MARKS = /[̀-ͯ]/g
  private static readonly D_STROKE = /đ/g

  static fold(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(TextFold.MARKS, '').replace(TextFold.D_STROKE, 'd')
  }
}

/** Immutable lookup structures over the word list: by id, by rank, by band, plus local search. */
export class WordIndex {
  static readonly HIT_SEPARATOR = ' — '

  readonly byId = new Map<string, Word>()
  readonly byRank = new Map<number, Word>()
  readonly byBand = new Map<number, Word[]>()
  readonly sorted: Word[]
  private readonly foldedVi = new Map<string, string>()

  constructor(readonly words: Word[]) {
    this.sorted = [...words].sort((a, b) => a.rank - b.rank)
    for (const w of this.sorted) this.add(w)
  }

  get total(): number {
    return this.words.length
  }

  search(query: string, limit: number, statusOf: StatusLookup, withVi = true): SearchHit[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const starts = this.sorted.filter(w => this.startsWith(w, q))
    const rest = this.sorted.filter(w => !this.startsWith(w, q) && w.lemma.toLowerCase().includes(q))
    const meaning = withVi ? this.sorted.filter(w => !this.lemmaMatches(w, q) && this.viMatches(w, q)) : []
    return [...starts, ...rest, ...meaning].slice(0, limit).map(w => this.toHit(w, statusOf(w.id), withVi))
  }

  private lemmaMatches(w: Word, q: string): boolean {
    return this.startsWith(w, q) || w.lemma.toLowerCase().includes(q)
  }

  private viMatches(w: Word, q: string): boolean {
    return !!w.vi && this.folded(w).includes(TextFold.fold(q))
  }

  private folded(w: Word): string {
    const known = this.foldedVi.get(w.id)
    if (known !== undefined) return known
    const folded = TextFold.fold(w.vi ?? '')
    this.foldedVi.set(w.id, folded)
    return folded
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

  private toHit(w: Word, status: Status, withVi: boolean): SearchHit {
    const text = w.definitions[0]?.text ?? ''
    const definition = withVi && w.vi ? `${w.vi}${WordIndex.HIT_SEPARATOR}${text}` : text
    return { id: w.id, lemma: w.lemma, rank: w.rank, definition, status }
  }
}
