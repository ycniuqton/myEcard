import { DefinitionProvider } from './DefinitionProvider'
import type { DiskCache } from './DiskCache'
import { DictionaryApiParser } from './DictionaryApiParser'
import { Endpoints, SourceName } from './PipelineConfig'
import { type FetchOutcome, HttpStatus, type HttpFetcher } from './HttpFetcher'
import type { DefinitionResult } from './types'

type CachedResponse = { status: number; payload: unknown }

/** Definitions and IPA from api.dictionaryapi.dev with an on-disk response cache. */
export class DictionaryApiProvider extends DefinitionProvider {
  readonly name = SourceName.DictionaryApi

  constructor(
    private readonly fetcher: HttpFetcher,
    private readonly cache: DiskCache,
    private readonly parser: DictionaryApiParser,
  ) {
    super()
  }

  async lookup(lemma: string): Promise<DefinitionResult | null> {
    const cached = this.cache.read<CachedResponse>(lemma) ?? (await this.fetchAndStore(lemma))
    return cached.status === HttpStatus.Ok ? this.parser.parse(cached.payload) : null
  }

  private async fetchAndStore(lemma: string): Promise<CachedResponse> {
    const outcome = await this.fetcher.getText(`${Endpoints.DictionaryApi}${encodeURIComponent(lemma)}`)
    const payload = outcome.status === HttpStatus.Ok ? this.safeParse(outcome.body) : null
    const status = this.statusOf(outcome, payload)
    const response = { status, payload }
    const final = status === HttpStatus.Ok || status === HttpStatus.NotFound
    if (final) this.cache.write(lemma, response)
    return response
  }

  private statusOf(outcome: FetchOutcome, payload: unknown): number {
    if (outcome.status === HttpStatus.Ok && outcome.body.trim().length === 0) return HttpStatus.NotFound
    return payload === undefined ? HttpStatus.ServerError : outcome.status
  }

  private safeParse(body: string): unknown {
    try {
      return JSON.parse(body)
    } catch {
      return undefined
    }
  }
}
