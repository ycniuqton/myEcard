import type { DefinitionResult } from './types'

/** Base for any source of definitions and IPA for a lemma. */
export abstract class DefinitionProvider {
  abstract readonly name: string

  abstract lookup(lemma: string): Promise<DefinitionResult | null>
}
