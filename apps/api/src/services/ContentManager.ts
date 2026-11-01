import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { Status, type Credit, type SearchHit, type Word, type WordList, type WordsResponse } from '@wordmap/shared'
import type { ContentData, ContentSource } from '../content/ContentSource'
import { AppError } from './AppError'

export enum HashAlgorithm {
  Sha1 = 'sha1',
}

export enum DigestEncoding {
  Hex = 'hex',
}

export type WordsPayload = { json: string; gzip: Buffer; etag: string }

export enum MatchScore {
  None = 0,
  Substring = 1,
  Form = 2,
  Prefix = 3,
  Exact = 4,
}

export class SearchLimits {
  static readonly DEFAULT = 20
  static readonly MAX = 50
}

/** In-memory word catalogue loaded from the first available content source. */
export class ContentManager {
  static readonly EMPTY_VERSION = 'empty'
  private readonly data: ContentData
  private readonly index = new Map<string, Word>()
  private readonly payload: WordsPayload

  constructor(sources: ContentSource[]) {
    this.data = this.firstAvailable(sources)
    this.data.words.forEach(w => this.index.set(w.id, w))
    this.payload = this.buildPayload()
  }

  get version(): string {
    return this.data.contentVersion
  }

  get words(): Word[] {
    return this.data.words
  }

  get credits(): Credit[] {
    return this.data.credits
  }

  get lists(): WordList[] {
    return this.data.lists
  }

  get wordsPayload(): WordsPayload {
    return this.payload
  }

  has(id: string): boolean {
    return this.index.has(id)
  }

  require(id: string): Word {
    const word = this.index.get(id)
    if (!word) throw AppError.notFound(`Unknown word: ${id}`)
    return word
  }

  search(query: string, limit: number, statusOf: (id: string) => Status): SearchHit[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const scored = this.data.words
      .map(w => ({ w, score: this.score(w, q) }))
      .filter(x => x.score > MatchScore.None)
      .sort((a, b) => b.score - a.score || a.w.rank - b.w.rank)
    return scored.slice(0, Math.min(limit, SearchLimits.MAX)).map(({ w }) => this.hit(w, statusOf(w.id)))
  }

  private score(word: Word, q: string): MatchScore {
    const lemma = word.lemma.toLowerCase()
    if (lemma === q) return MatchScore.Exact
    if (lemma.startsWith(q)) return MatchScore.Prefix
    if (word.forms?.some(f => f.toLowerCase() === q)) return MatchScore.Form
    return lemma.includes(q) ? MatchScore.Substring : MatchScore.None
  }

  private hit(word: Word, status: Status): SearchHit {
    const definition = word.definitions[0]?.text ?? ''
    return { id: word.id, lemma: word.lemma, rank: word.rank, definition, status }
  }

  private firstAvailable(sources: ContentSource[]): ContentData {
    for (const source of sources) {
      const loaded = source.load()
      if (loaded) return loaded
    }
    return { contentVersion: ContentManager.EMPTY_VERSION, words: [], credits: [], lists: [] }
  }

  private buildPayload(): WordsPayload {
    const body: WordsResponse = { contentVersion: this.data.contentVersion, words: this.data.words }
    const json = JSON.stringify(body)
    const etag = `"${createHash(HashAlgorithm.Sha1).update(json).digest(DigestEncoding.Hex)}"`
    return { json, gzip: gzipSync(json), etag }
  }
}
