import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import type { ExtensionSourceInfo } from './CandidateReader'
import { CreditsCatalog } from './CreditsCatalog'
import { ExtensionFiles, ExtensionLimits, SkipReason } from './ExtensionConfig'
import type { SkipRecord } from './ExtensionManager'
import { GapKind, ListId, PipelineFiles, PipelineLimits, type PipelinePaths } from './PipelineConfig'
import type { Gap, WordRecord } from './types'

export class ExportFormat {
  static readonly MISSING_HEADER = 'lemma,rank,gap'
  static readonly LINE_BREAK = '\n'
  static readonly JSON_INDENT = 2
}

export type ExportPlan = { json: string; gzipBytes: number; trimmed: boolean }

/** Writes words.v2.json, lists.json, credits.json and missing.csv; each file is written to a temp file then renamed. */
export class Exporter {
  constructor(private readonly paths: PipelinePaths) {}

  plan(words: WordRecord[]): ExportPlan {
    const whole = this.serialise(words)
    if (whole.gzipBytes <= PipelineLimits.MaxGzipBytes) return { ...whole, trimmed: false }
    const slim = words.map(word => (word.listIds.includes(ListId.Extended) ? { ...word, examples: word.examples.slice(0, ExtensionLimits.TrimmedExamples) } : word))
    return { ...this.serialise(slim), trimmed: true }
  }

  write(words: WordRecord[], gaps: Gap[], source: ExtensionSourceInfo | undefined, skips: SkipRecord[]): ExportPlan {
    const indent = ExportFormat.JSON_INDENT
    const plan = this.plan(words)
    this.atomic(join(this.paths.content, PipelineFiles.LISTS), JSON.stringify(this.lists(words, source), null, indent))
    this.atomic(join(this.paths.content, PipelineFiles.CREDITS), JSON.stringify(CreditsCatalog.credits(source), null, indent))
    this.atomic(this.paths.missing, this.missingCsv(gaps, skips))
    this.atomic(join(this.paths.cache, ExtensionFiles.SKIPS), this.skipsCsv(skips))
    this.atomic(this.wordsFile(), plan.json)
    return plan
  }

  writePreview(words: WordRecord[], skips: SkipRecord[]): ExportPlan {
    const plan = this.plan(words)
    this.atomic(this.paths.preview, plan.json)
    this.atomic(join(this.paths.cache, ExtensionFiles.SKIPS), this.skipsCsv(skips))
    return plan
  }

  lists(words: WordRecord[], source?: ExtensionSourceInfo) {
    const idsIn = (list: ListId) => words.filter(w => w.listIds.includes(list)).map(w => w.id)
    return CreditsCatalog.lists(source).map(list => ({ ...list, wordIds: idsIn(list.id) }))
  }

  missingCsv(gaps: Gap[], skips: SkipRecord[] = []): string {
    const undefinedSkips = skips.filter(skip => skip.reason === SkipReason.NoDefinition)
    const lines = [
      ExportFormat.MISSING_HEADER,
      ...gaps.map(gap => `${gap.lemma},${gap.rank},${gap.gap}`),
      ...undefinedSkips.map(skip => `${skip.lemma},${skip.rank},${GapKind.Definition}`),
    ]
    return lines.join(ExportFormat.LINE_BREAK) + ExportFormat.LINE_BREAK
  }

  skipsCsv(skips: SkipRecord[]): string {
    const lines = [ExtensionFiles.SKIPS_HEADER, ...skips.map(skip => `${skip.lemma},${skip.rank},${skip.reason}`)]
    return lines.join(ExportFormat.LINE_BREAK) + ExportFormat.LINE_BREAK
  }

  private serialise(words: WordRecord[]): { json: string; gzipBytes: number } {
    const json = JSON.stringify({ contentVersion: PipelineLimits.ContentVersion, words })
    return { json, gzipBytes: gzipSync(json).length }
  }

  private wordsFile(): string {
    return join(this.paths.content, `${PipelineFiles.WORDS_PREFIX}${PipelineLimits.ContentVersion}${PipelineFiles.WORDS_SUFFIX}`)
  }

  private atomic(path: string, content: string): void {
    mkdirSync(dirname(path), { recursive: true })
    const temp = `${path}${PipelineFiles.TEMP_SUFFIX}`
    writeFileSync(temp, content)
    renameSync(temp, path)
  }
}
