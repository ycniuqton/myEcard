import { Status, type SearchResponse } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { ContentManager } from './ContentManager'

/** Word search enriched with the caller's learning status of each hit. */
export class SearchManager {
  constructor(private readonly repo: ProgressRepository, private readonly content: ContentManager) {}

  async search(query: string, limit: number): Promise<SearchResponse> {
    const hits = this.content.search(query, limit, () => Status.Unknown)
    const words = await Promise.all(hits.map(h => this.repo.getUserWord(h.id)))
    return { hits: hits.map((h, i) => ({ ...h, status: words[i]?.status ?? Status.Unknown })) }
  }
}
