import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CreditsCatalog, type Credit } from '../CreditsCatalog'
import { PipelinePaths } from '../PipelineConfig'
import type { WordRecord } from '../types'
import { ViFiles, ViGap, ViLimits, type ViCache, type ViOverrides, type ViWord } from './ViConfig'

export type ContentWord = WordRecord & { vi?: string }
export type WordsFile = { contentVersion: string; words: ContentWord[] }

/** Reads and writes the files the Vietnamese step touches: words, credits, missing.csv, overrides and the fetch cache. */
export class ViContentFile {
  constructor(private readonly paths: PipelinePaths) {}

  get cachePath(): string {
    return join(this.paths.cache, ViFiles.WIKTIONARY_CACHE)
  }

  readWords(): WordsFile {
    return this.readJson<WordsFile>(join(this.paths.content, ViFiles.WORDS))
  }

  readCache(): ViCache {
    return existsSync(this.cachePath) ? this.readJson<ViCache>(this.cachePath) : {}
  }

  readOverrides(): ViOverrides {
    const file = join(this.paths.raw, ViFiles.OVERRIDES)
    return existsSync(file) ? this.readJson<ViOverrides>(file) : {}
  }

  writeWords(file: WordsFile, meanings: Map<string, string>): void {
    const words = file.words.map(word => this.withMeaning(word, meanings.get(word.id)))
    this.atomic(join(this.paths.content, ViFiles.WORDS), JSON.stringify({ contentVersion: ViLimits.ContentVersion, words }))
  }

  writeCredits(): void {
    const target = join(this.paths.content, ViFiles.CREDITS)
    const kept = this.readJson<Credit[]>(target).filter(credit => credit.name !== CreditsCatalog.VIETNAMESE_NAME)
    const index = kept.findIndex(credit => credit.name === CreditsCatalog.WIKTIONARY_NAME)
    kept.splice(index + 1, 0, CreditsCatalog.vietnameseCredit())
    this.atomic(target, JSON.stringify(kept, null, 2))
  }

  writeMissing(gaps: ViWord[]): void {
    const kept = this.missingLines().filter(line => !line.endsWith(`,${ViGap.KIND}`))
    const added = gaps.map(word => `${word.lemma},${word.rank},${ViGap.KIND}`)
    this.atomic(this.paths.missing, [...kept, ...added].join(ViFiles.MISSING_LINE_BREAK) + ViFiles.MISSING_LINE_BREAK)
  }

  private missingLines(): string[] {
    if (!existsSync(this.paths.missing)) return []
    return readFileSync(this.paths.missing, ViFiles.ENCODING).split(/\r?\n/).filter(Boolean)
  }

  private withMeaning(word: ContentWord, meaning: string | undefined): ContentWord {
    const { vi: _previous, ...rest } = word
    return meaning ? { ...rest, vi: meaning } : rest
  }

  private readJson<T>(file: string): T {
    return JSON.parse(readFileSync(file, ViFiles.ENCODING)) as T
  }

  private atomic(path: string, content: string): void {
    const temp = `${path}${ViFiles.TEMP_SUFFIX}`
    writeFileSync(temp, content, ViFiles.ENCODING)
    renameSync(temp, path)
  }
}
