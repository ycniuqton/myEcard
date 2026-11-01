import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { ExampleProvider } from './ExampleProvider'
import { ExampleSource, PipelineLimits, Encoding, SourceName } from './PipelineConfig'
import type { SentenceFilter } from './SentenceFilter'
import type { TatoebaSource } from './TatoebaSource'
import type { ExampleEntry, TokenContext, WordSeed } from './types'

type Sentence = { id: string; text: string; tokens: string[]; coverage: number; used: number; plain?: Set<string> }

/** Picks example sentences from the Tatoeba English export, preferring simple NGSL-only text. */
export class TatoebaProvider extends ExampleProvider {
  static readonly ID_COL = 0
  static readonly TEXT_COL = 2
  static readonly COLUMN_SEPARATOR = '\t'

  readonly name = SourceName.Tatoeba
  private sentences: Sentence[] = []
  private byForm = new Map<string, number[]>()

  constructor(
    private readonly source: TatoebaSource,
    private readonly filter: SentenceFilter,
    private readonly minCoverage: number = PipelineLimits.MinCoverage,
    private readonly plainFormsOnly: boolean = false,
  ) {
    super()
  }

  async prepare(vocabulary: Set<string>): Promise<void> {
    const path = await this.source.ensureExtracted()
    const lines = createInterface({ input: createReadStream(path, Encoding.Utf8), crlfDelay: Infinity })
    for await (const line of lines) this.consider(line, vocabulary)
  }

  examplesFor(seed: WordSeed, limit: number): ExampleEntry[] {
    const forms = new Set([seed.lemma, ...seed.forms])
    const picked = this.rank(seed, forms).slice(0, limit)
    picked.forEach(sentence => sentence.used++)
    return picked.map(sentence => ({ text: sentence.text, source: ExampleSource.Tatoeba, sourceId: sentence.id }))
  }

  countFor(seed: WordSeed): number {
    return this.rank(seed, new Set([seed.lemma, ...seed.forms])).length
  }

  contextsFor(seed: WordSeed, limit: number): TokenContext[] {
    const forms = new Set([seed.lemma, ...seed.forms])
    const found: TokenContext[] = []
    for (const form of forms) {
      for (const position of this.byForm.get(form) ?? []) {
        if (found.length >= limit) return found
        found.push(...this.contextsIn(this.sentences[position].tokens, form))
      }
    }
    return found
  }

  get size(): number {
    return this.sentences.length
  }

  private consider(line: string, vocabulary: Set<string>): void {
    const cols = line.split(TatoebaProvider.COLUMN_SEPARATOR)
    const text = (cols[TatoebaProvider.TEXT_COL] ?? '').trim()
    if (!this.filter.isEligible(text)) return
    const coverage = this.filter.coverage(text, vocabulary)
    if (coverage < this.minCoverage) return
    const plain = this.plainFormsOnly ? this.filter.plainTokens(text) : undefined
    this.index({ id: cols[TatoebaProvider.ID_COL], text, tokens: this.filter.tokenize(text), coverage, used: 0, plain })
  }

  private contextsIn(tokens: string[], form: string): TokenContext[] {
    const at = tokens.indexOf(form)
    return at < 0 ? [] : [{ prev: tokens[at - 1], next: tokens[at + 1], token: form }]
  }

  private index(sentence: Sentence): void {
    const position = this.sentences.push(sentence) - 1
    for (const token of sentence.plain ?? new Set(sentence.tokens)) {
      const list = this.byForm.get(token)
      if (list) list.push(position)
      else this.byForm.set(token, [position])
    }
  }

  private rank(seed: WordSeed, forms: Set<string>): Sentence[] {
    const seen = new Set<string>()
    const candidates: Sentence[] = []
    for (const form of forms) {
      for (const position of this.byForm.get(form) ?? []) {
        if (!seen.has(this.sentences[position].id)) candidates.push(this.sentences[position])
        seen.add(this.sentences[position].id)
      }
    }
    const scored = candidates.map(sentence => ({ sentence, score: this.score(sentence, seed) }))
    scored.sort((a, b) => b.score - a.score || Number(a.sentence.id) - Number(b.sentence.id))
    return this.dedupeText(scored.map(item => item.sentence))
  }

  private score(sentence: Sentence, seed: WordSeed): number {
    const exact = sentence.tokens.includes(seed.lemma) ? PipelineLimits.ExactLemmaBonus : 0
    const lengthGap = Math.abs(sentence.tokens.length - PipelineLimits.IdealSentenceWords)
    const base = sentence.coverage * PipelineLimits.PercentScale
    return base + exact - sentence.used * PipelineLimits.ReusePenalty - lengthGap * PipelineLimits.LengthPenalty
  }

  private dedupeText(sorted: Sentence[]): Sentence[] {
    const texts = new Set<string>()
    return sorted.filter(sentence => {
      const key = sentence.text.toLowerCase()
      if (texts.has(key)) return false
      texts.add(key)
      return true
    })
  }
}
