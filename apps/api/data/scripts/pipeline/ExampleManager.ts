import type { ExampleProvider } from './ExampleProvider'
import type { ExampleEntry, TokenContext, WordSeed } from './types'

/** Prepares configured providers and fills each word's examples in provider order. */
export class ExampleManager {
  constructor(private readonly providers: ExampleProvider[]) {}

  async prepare(vocabulary: Set<string>): Promise<void> {
    for (const provider of this.providers) await provider.prepare(vocabulary)
  }

  examplesFor(seed: WordSeed, limit: number): ExampleEntry[] {
    const collected: ExampleEntry[] = []
    for (const provider of this.providers) {
      if (collected.length >= limit) break
      collected.push(...provider.examplesFor(seed, limit - collected.length))
    }
    return collected
  }

  countFor(seed: WordSeed): number {
    return this.providers.reduce((sum, provider) => sum + provider.countFor(seed), 0)
  }

  contextsFor(seed: WordSeed, limit: number): TokenContext[] {
    return this.providers.flatMap(provider => provider.contextsFor(seed, limit)).slice(0, limit)
  }
}
