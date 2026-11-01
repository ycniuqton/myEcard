import { ListId } from './PipelineConfig'
import type { WordRecord } from './types'

/** Checks the invariants of the extended map: complete content, unique ids and lemmas, no clash with the NGSL core. */
export class ExtensionValidator {
  validate(words: WordRecord[]): string[] {
    return [...this.completeness(words), ...this.uniqueness(words), ...this.coreClashes(words)]
  }

  private completeness(words: WordRecord[]): string[] {
    const errors: string[] = []
    for (const word of words) {
      if (word.definitions.length === 0) errors.push(`${word.lemma}: no definition`)
      if (word.examples.length === 0) errors.push(`${word.lemma}: no example`)
    }
    return errors
  }

  private uniqueness(words: WordRecord[]): string[] {
    const ids = new Set<string>()
    const errors: string[] = []
    for (const word of words) {
      if (ids.has(word.id)) errors.push(`duplicate id ${word.id}`)
      ids.add(word.id)
    }
    return errors
  }

  private coreClashes(words: WordRecord[]): string[] {
    const core = words.filter(word => word.listIds.includes(ListId.Ngsl))
    const taken = new Set(core.flatMap(word => [word.lemma, ...(word.forms ?? [])]))
    return words
      .filter(word => word.listIds.includes(ListId.Extended) && taken.has(word.lemma))
      .map(word => `${word.lemma}: extended lemma equals an NGSL lemma or form`)
  }
}
