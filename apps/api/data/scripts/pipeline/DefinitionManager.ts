import type { DefinitionProvider } from './DefinitionProvider'
import type { DefinitionResult } from './types'

/** Asks providers in order: first usable definitions win, later providers may only add a missing IPA. */
export class DefinitionManager {
  constructor(private readonly providers: DefinitionProvider[]) {}

  async lookup(lemma: string): Promise<DefinitionResult | null> {
    let best = null as DefinitionResult | null
    for (const provider of this.providers) {
      if (best?.ipa) break
      const result = await provider.lookup(lemma)
      if (!result) continue
      best = best ? { ...best, ipa: result.ipa } : result
    }
    return best && Object.keys(best.senses).length > 0 ? best : null
  }
}
