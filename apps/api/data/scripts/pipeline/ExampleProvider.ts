import type { ExampleEntry, TokenContext, WordSeed } from './types'

/** Base for any source of example sentences for a lemma. */
export abstract class ExampleProvider {
  abstract readonly name: string

  abstract prepare(vocabulary: Set<string>): Promise<void>

  abstract examplesFor(seed: WordSeed, limit: number): ExampleEntry[]

  abstract countFor(seed: WordSeed): number

  abstract contextsFor(seed: WordSeed, limit: number): TokenContext[]
}
