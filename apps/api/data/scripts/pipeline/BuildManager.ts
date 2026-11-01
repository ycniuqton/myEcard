import { BoundedRunner } from './BoundedRunner'
import type { DefinitionManager } from './DefinitionManager'
import type { ExampleManager } from './ExampleManager'
import { Exporter } from './Exporter'
import { ExtensionValidator } from './ExtensionValidator'
import type { ExtensionManager, ExtensionResult, SkipRecord } from './ExtensionManager'
import { FormsGenerator } from './FormsGenerator'
import { ManualFixesApplier } from './ManualFixes'
import type { NgslImporter } from './NgslImporter'
import { ListId, PipelineLimits } from './PipelineConfig'
import { PosEvidence } from './PosEvidence'
import { SenseSelector } from './SenseSelector'
import { Validator, type ValidationReport } from './Validator'
import { WordIdentity } from './WordIdentity'
import type { Gap, NgslEntry, SenseGroups, WordRecord, WordSeed } from './types'

export type BuildSummary = {
  words: number; gaps: number; errors: string[]; gzipBytes: number; failures: string[]; skipped: number; trimmed: boolean; written: boolean
}

export type BuildOptions = { targetCount: number; dryRun: boolean }

/** Orchestrates import, definitions, forms, examples, validation and export. */
export class BuildManager {
  private readonly forms = new FormsGenerator()
  private readonly validator = new Validator()
  private readonly evidence = new PosEvidence()
  private readonly selector = new SenseSelector()
  private readonly extensionValidator = new ExtensionValidator()
  private readonly senses = new Map<string, SenseGroups>()

  constructor(
    private readonly importer: NgslImporter,
    private readonly definitions: DefinitionManager,
    private readonly examples: ExampleManager,
    private readonly manual: ManualFixesApplier,
    private readonly exporter: Exporter,
    private readonly log: (message: string) => void,
    private readonly extension: ExtensionManager | null,
    private readonly options: BuildOptions,
  ) {}

  async run(): Promise<BuildSummary> {
    const failures: string[] = []
    const core = await this.buildCore(failures)
    const extended = await this.extend(core)
    const words = [...core, ...(extended?.words ?? [])]
    const skips = extended?.skips ?? []
    const report = this.validate(words)
    const errors = [...report.errors, ...this.extensionValidator.validate(words)]
    const summary = { words: words.length, gaps: report.gaps.length, errors, failures, skipped: skips.length }
    if (errors.length > 0) return { ...summary, gzipBytes: 0, trimmed: false, written: false }
    const plan = this.export(words, report.gaps, extended, skips)
    return { ...summary, gzipBytes: plan.gzipBytes, trimmed: plan.trimmed, written: !this.isPreview() }
  }

  private async buildCore(failures: string[]): Promise<WordRecord[]> {
    const entries = this.importer.loadEntries()
    const spoken = this.importer.loadSpoken()
    const words = entries.map(entry => this.newWord(entry, spoken))
    await this.fillCandidates(words, failures)
    this.fillForms(words)
    await this.examples.prepare(this.vocabulary(words))
    this.fillContent(words)
    return words
  }

  private async extend(core: WordRecord[]): Promise<ExtensionResult | null> {
    return this.extension ? this.extension.extend(core, this.options.targetCount) : null
  }

  private export(words: WordRecord[], gaps: Gap[], extended: ExtensionResult | null, skips: SkipRecord[]) {
    return this.isPreview() ? this.exporter.writePreview(words, skips) : this.exporter.write(words, gaps, extended?.source, skips)
  }

  private isPreview(): boolean {
    return this.options.dryRun || this.extension === null
  }

  validate(words: WordRecord[]): ValidationReport {
    return this.validator.validate(words, this.options.targetCount)
  }

  private newWord(entry: NgslEntry, spoken: Set<string>): WordRecord {
    const listIds = spoken.has(entry.lemma) ? [ListId.Ngsl, ListId.NgslSpoken] : [ListId.Ngsl]
    return {
      id: WordIdentity.idFor(entry.rank), lemma: entry.lemma, rank: entry.rank,
      band: WordIdentity.bandFor(entry.rank), pos: [], definitions: [], examples: [], listIds,
    }
  }

  private async fillCandidates(words: WordRecord[], failures: string[]): Promise<void> {
    let done = 0
    await new BoundedRunner(PipelineLimits.FetchConcurrency).run(words, async word => {
      await this.lookupOne(word, failures)
      if (++done % PipelineLimits.ProgressEvery === 0) this.log(`definitions ${done}/${words.length}`)
    })
  }

  private async lookupOne(word: WordRecord, failures: string[]): Promise<void> {
    try {
      const result = await this.definitions.lookup(word.lemma)
      if (!result) return
      this.senses.set(word.lemma, result.senses)
      word.ipa = result.ipa
      word.pos = Object.keys(result.senses)
    } catch (error) {
      failures.push(`${word.lemma}: ${(error as Error).message}`)
    }
  }

  private fillForms(words: WordRecord[]): void {
    const listed = this.importer.loadForms()
    for (const word of words) {
      const forms = this.forms.generate(word.lemma, word.pos, listed.get(word.lemma))
      if (forms.length > 0) word.forms = forms
    }
  }

  private fillContent(words: WordRecord[]): void {
    for (const word of words) {
      const seed = this.seedOf(word)
      this.chooseDefinitions(word, seed)
      this.manual.applyDefinitions(word)
      word.examples = this.examples.examplesFor(seed, PipelineLimits.ExamplesPerWord)
      this.manual.applyExamples(word)
    }
    this.log(`content assigned for ${words.length} words`)
  }

  private chooseDefinitions(word: WordRecord, seed: WordSeed): void {
    const senses = this.senses.get(word.lemma)
    if (!senses) return
    const contexts = this.examples.contextsFor(seed, PipelineLimits.EvidenceSamples)
    word.definitions = this.selector.select(senses, this.evidence.score(word.lemma, contexts))
    word.pos = [...new Set(word.definitions.map(definition => definition.pos))]
  }

  private vocabulary(words: WordRecord[]): Set<string> {
    return new Set(words.flatMap(word => [word.lemma, ...(word.forms ?? [])]))
  }

  private seedOf(word: WordRecord): WordSeed {
    return { lemma: word.lemma, forms: word.forms ?? [], pos: word.pos }
  }
}
