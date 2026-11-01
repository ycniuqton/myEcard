import { BoundedRunner } from './BoundedRunner'
import type { CandidateReader, ExtensionSourceInfo } from './CandidateReader'
import { CandidateFilter } from './CandidateFilter'
import type { CapitalisationStats } from './CapitalisationStats'
import type { DefinitionManager } from './DefinitionManager'
import type { ExampleManager } from './ExampleManager'
import { ExtensionLimits, SkipReason } from './ExtensionConfig'
import type { ExtendedSenseSelector } from './ExtendedSenseSelector'
import type { ExtensionSourceResolver } from './ExtensionSourceResolver'
import { FormsGenerator } from './FormsGenerator'
import type { ManualFixesApplier } from './ManualFixes'
import { ListId, PipelineLimits, Pos } from './PipelineConfig'
import { PosEvidence } from './PosEvidence'
import { WordIdentity } from './WordIdentity'
import type { DefinitionResult, WordRecord, WordSeed } from './types'

export type SkipRecord = { lemma: string; rank: number; reason: SkipReason }

export type ExtensionResult = { words: WordRecord[]; skips: SkipRecord[]; source: ExtensionSourceInfo; poolSize: number }

type Lookups = Map<string, DefinitionResult | null>

/** Grows the map past the NGSL core: filter candidates, fetch definitions, attach examples, skip incomplete ones. */
export class ExtensionManager {
  private readonly forms = new FormsGenerator()
  private readonly evidence = new PosEvidence()

  constructor(
    private readonly resolver: ExtensionSourceResolver,
    private readonly stats: CapitalisationStats,
    private readonly tatoebaTsv: string,
    private readonly definitions: DefinitionManager,
    private readonly examples: ExampleManager,
    private readonly selector: ExtendedSenseSelector,
    private readonly manual: ManualFixesApplier,
    private readonly log: (message: string) => void,
  ) {}

  async extend(core: WordRecord[], targetCount: number): Promise<ExtensionResult> {
    const reader = this.resolver.resolve()
    this.log(`extension source ${reader.info.id} (${reader.info.license})`)
    const pool = await this.candidatePool(reader, core)
    this.selector.learn(core.flatMap(word => [word.lemma, ...(word.forms ?? [])]))
    await this.examples.prepare(this.vocabulary(core, pool))
    const collected = await this.collect(pool, core.length, targetCount - core.length)
    return { ...collected, source: reader.info, poolSize: pool.length }
  }

  private async candidatePool(reader: CandidateReader, core: WordRecord[]): Promise<string[]> {
    await this.stats.scan(this.tatoebaTsv)
    const coreForms = new Set(core.flatMap(word => [word.lemma, ...(word.forms ?? [])]))
    const report = CandidateFilter.standard(this.stats, coreForms, new Set(core.map(word => word.lemma))).filter(reader.read())
    const rejected = [...report.rejected].map(([reason, count]) => `${reason}=${count}`).join(' ')
    this.log(`candidates accepted by filter ${report.accepted.length}; rejected ${rejected}`)
    return report.accepted
  }

  private vocabulary(core: WordRecord[], pool: string[]): Set<string> {
    const vocabulary = new Set(core.flatMap(word => [word.lemma, ...(word.forms ?? [])]))
    for (const lemma of pool.slice(0, ExtensionLimits.VocabularyCandidates)) {
      vocabulary.add(lemma)
      this.forms.generated(lemma, [Pos.Noun, Pos.Verb, Pos.Adjective]).forEach(form => vocabulary.add(form))
    }
    return vocabulary
  }

  private async collect(pool: string[], coreCount: number, needed: number): Promise<Pick<ExtensionResult, 'words' | 'skips'>> {
    const words: WordRecord[] = []
    const skips: SkipRecord[] = []
    let cursor = 0
    while (words.length < needed && cursor < pool.length) {
      const batch = pool.slice(cursor, cursor + ExtensionLimits.BatchSize)
      cursor += batch.length
      const lookups = await this.lookupBatch(batch, coreCount + words.length + 1, skips)
      this.finishBatch(batch, lookups, { words, skips, coreCount, needed })
      this.log(`extension words ${words.length}/${needed} (candidates tried ${cursor}, skipped ${skips.length})`)
    }
    return { words, skips }
  }

  private async lookupBatch(batch: string[], nextRank: number, skips: SkipRecord[]): Promise<Lookups> {
    const lookups: Lookups = new Map()
    const withExamples = batch.filter(lemma => this.examples.countFor(this.seedOf(lemma, this.allPos())) >= ExtensionLimits.ExamplesPerWord)
    batch.filter(lemma => !withExamples.includes(lemma)).forEach(lemma => skips.push({ lemma, rank: nextRank, reason: SkipReason.NoExample }))
    await new BoundedRunner(PipelineLimits.FetchConcurrency).run(withExamples, async lemma => {
      lookups.set(lemma, await this.safeLookup(lemma))
    })
    return lookups
  }

  private async safeLookup(lemma: string): Promise<DefinitionResult | null> {
    try {
      return await this.definitions.lookup(lemma)
    } catch {
      return null
    }
  }

  private finishBatch(batch: string[], lookups: Lookups, state: { words: WordRecord[]; skips: SkipRecord[]; coreCount: number; needed: number }): void {
    for (const lemma of batch) {
      if (state.words.length >= state.needed) return
      if (!lookups.has(lemma)) continue
      const rank = state.coreCount + state.words.length + 1
      const outcome = this.build(lemma, rank, lookups.get(lemma) ?? null)
      if (outcome.word) state.words.push(outcome.word)
      else state.skips.push({ lemma, rank, reason: outcome.reason })
    }
  }

  private build(lemma: string, rank: number, result: DefinitionResult | null): { word?: WordRecord; reason: SkipReason } {
    const word = this.newWord(lemma, rank)
    this.fillDefinitions(word, result)
    if (word.definitions.length === 0) return { reason: SkipReason.NoDefinition }
    const seed = this.seedOf(lemma, word.pos, word)
    const custom = this.manual.fixFor(lemma)?.examples?.length ?? 0
    if (this.examples.countFor(seed) + custom < ExtensionLimits.ExamplesPerWord) return { reason: SkipReason.NoExample }
    word.examples = this.examples.examplesFor(seed, ExtensionLimits.ExamplesPerWord)
    this.manual.applyExamples(word, ExtensionLimits.ExamplesPerWord)
    return { word, reason: SkipReason.NoExample }
  }

  private fillDefinitions(word: WordRecord, result: DefinitionResult | null): void {
    if (result) {
      const contexts = this.examples.contextsFor(this.seedOf(word.lemma, Object.keys(result.senses)), PipelineLimits.EvidenceSamples)
      word.definitions = this.selector.select(result.senses, this.evidence.score(word.lemma, contexts))
      word.pos = [...new Set(word.definitions.map(definition => definition.pos))]
      word.ipa = result.ipa
    }
    this.manual.applyDefinitions(word)
  }

  private newWord(lemma: string, rank: number): WordRecord {
    return {
      id: WordIdentity.idFor(rank), lemma, rank, band: WordIdentity.bandFor(rank),
      pos: [], definitions: [], examples: [], listIds: [ListId.Extended],
    }
  }

  private seedOf(lemma: string, pos: string[], word?: WordRecord): WordSeed {
    const forms = this.forms.generate(lemma, pos, undefined)
    if (word && forms.length > 0) word.forms = forms
    return { lemma, forms, pos }
  }

  private allPos(): string[] {
    return [Pos.Noun, Pos.Verb, Pos.Adjective]
  }
}
