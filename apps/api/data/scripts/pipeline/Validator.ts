import { GapKind } from './PipelineConfig'
import { WordIdentity } from './WordIdentity'
import type { Gap, WordRecord } from './types'

export type ValidationReport = { errors: string[]; gaps: Gap[] }

/** Checks structural integrity and lists words lacking a definition or example. */
export class Validator {
  validate(words: WordRecord[], expectedCount?: number): ValidationReport {
    const errors = this.structuralErrors(words, expectedCount)
    return { errors, gaps: this.gaps(words) }
  }

  gaps(words: WordRecord[]): Gap[] {
    const gaps: Gap[] = []
    for (const word of words) {
      if (word.definitions.length === 0) gaps.push({ lemma: word.lemma, rank: word.rank, gap: GapKind.Definition })
      if (word.examples.length === 0) gaps.push({ lemma: word.lemma, rank: word.rank, gap: GapKind.Example })
    }
    return gaps
  }

  private structuralErrors(words: WordRecord[], expectedCount?: number): string[] {
    const errors: string[] = []
    if (expectedCount !== undefined && words.length !== expectedCount) {
      errors.push(`expected ${expectedCount} words, got ${words.length}`)
    }
    const lemmas = new Set<string>()
    words.forEach((word, index) => {
      errors.push(...this.wordErrors(word, index + 1))
      if (lemmas.has(word.lemma)) errors.push(`duplicate lemma ${word.lemma}`)
      lemmas.add(word.lemma)
    })
    return errors
  }

  private wordErrors(word: WordRecord, expectedRank: number): string[] {
    const errors: string[] = []
    if (word.rank !== expectedRank) errors.push(`${word.lemma}: rank ${word.rank}, expected ${expectedRank}`)
    if (word.id !== WordIdentity.idFor(word.rank)) errors.push(`${word.lemma}: bad id ${word.id}`)
    if (word.band !== WordIdentity.bandFor(word.rank)) errors.push(`${word.lemma}: bad band ${word.band}`)
    return errors
  }
}
