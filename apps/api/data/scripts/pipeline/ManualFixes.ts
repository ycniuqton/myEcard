import { existsSync, readFileSync } from 'node:fs'
import { ExampleSource, PipelineLimits, Encoding } from './PipelineConfig'
import type { ExampleEntry, ManualFix, ManualFixes, WordRecord } from './types'

/** Hand-written content that fills or overrides pipeline gaps (source "custom"). */
export class ManualFixesApplier {
  constructor(private readonly fixes: ManualFixes) {}

  static fromFile(path: string, ...overlays: string[]): ManualFixesApplier {
    const read = (file: string): ManualFixes => (existsSync(file) ? (JSON.parse(readFileSync(file, Encoding.Utf8)) as ManualFixes) : {})
    return new ManualFixesApplier(Object.assign({}, read(path), ...overlays.map(read)))
  }

  fixFor(lemma: string): ManualFix | undefined {
    return this.fixes[lemma]
  }

  applyDefinitions(word: WordRecord): void {
    const fix = this.fixFor(word.lemma)
    if (!fix) return
    if (fix.ipa) word.ipa = fix.ipa
    if (fix.definitions && fix.definitions.length > 0) word.definitions = fix.definitions
    word.pos = [...new Set(word.definitions.map(definition => definition.pos))]
  }

  applyExamples(word: WordRecord, limit: number = PipelineLimits.ExamplesPerWord): void {
    const custom = (this.fixFor(word.lemma)?.examples ?? []).map(
      (text): ExampleEntry => ({ text, source: ExampleSource.Custom }),
    )
    word.examples = [...custom, ...word.examples].slice(0, limit)
  }
}
