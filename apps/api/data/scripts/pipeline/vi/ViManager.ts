import type { ViSourceName, ViWord } from './ViConfig'
import type { ViSource } from './ViSource'

export type ViOutcome = { meanings: Map<string, string>; gaps: ViWord[]; bySource: Record<string, number> }

/** Gives every word its Vietnamese meaning from the first source that has one and reports the words left without. */
export class ViManager {
  constructor(private readonly sources: ViSource[]) {}

  apply(words: ViWord[]): ViOutcome {
    const outcome: ViOutcome = { meanings: new Map(), gaps: [], bySource: {} }
    for (const word of words) this.resolve(word, outcome)
    return outcome
  }

  private resolve(word: ViWord, outcome: ViOutcome): void {
    for (const source of this.sources) {
      const meaning = source.meaningFor(word)
      if (meaning) return this.record(word, source.name, meaning, outcome)
    }
    outcome.gaps.push(word)
  }

  private record(word: ViWord, name: ViSourceName, meaning: string, outcome: ViOutcome): void {
    outcome.meanings.set(word.id, meaning)
    outcome.bySource[name] = (outcome.bySource[name] ?? 0) + 1
  }
}
