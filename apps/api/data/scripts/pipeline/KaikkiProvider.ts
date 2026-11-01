import { DefinitionProvider } from './DefinitionProvider'
import type { DiskCache } from './DiskCache'
import { HttpStatus, type HttpFetcher } from './HttpFetcher'
import { Endpoints, SourceName } from './PipelineConfig'
import type { KaikkiParser } from './KaikkiParser'
import type { DefinitionResult } from './types'

type CachedResult = { result: DefinitionResult | null }

/** Fallback definitions from kaikki.org Wiktionary extracts; caches only the parsed result. */
export class KaikkiProvider extends DefinitionProvider {
  static readonly SHARD_ONE = 1
  static readonly SHARD_TWO = 2

  readonly name = SourceName.Kaikki

  constructor(
    private readonly fetcher: HttpFetcher,
    private readonly cache: DiskCache,
    private readonly parser: KaikkiParser,
  ) {
    super()
  }

  async lookup(lemma: string): Promise<DefinitionResult | null> {
    const cached = this.cache.read<CachedResult>(lemma)
    if (cached) return cached.result
    const outcome = await this.fetcher.getText(this.urlFor(lemma))
    if (outcome.status !== HttpStatus.Ok && outcome.status !== HttpStatus.NotFound) return null
    const result = outcome.status === HttpStatus.Ok ? this.parser.parse(outcome.body, lemma) : null
    this.cache.write(lemma, { result })
    return result
  }

  urlFor(lemma: string): string {
    const shard = lemma.slice(0, KaikkiProvider.SHARD_TWO)
    return `${Endpoints.KaikkiMeaning}${lemma.slice(0, KaikkiProvider.SHARD_ONE)}/${shard}/${encodeURIComponent(lemma)}.jsonl`
  }
}
