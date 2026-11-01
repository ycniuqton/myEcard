import { PipelineConstants } from './PipelineConstants'
import { DefinitionCleaner } from './DefinitionCleaner'
import { Pos } from './PipelineConfig'
import type { DefinitionResult, SenseGroups } from './types'

type ApiDefinition = { definition?: string }
type ApiMeaning = { partOfSpeech?: string; definitions?: ApiDefinition[] }
type ApiPhonetic = { text?: string }
type ApiEntry = { phonetic?: string; phonetics?: ApiPhonetic[]; meanings?: ApiMeaning[] }

/** Turns a dictionaryapi.dev payload into IPA plus a few clean definitions. */
export class DictionaryApiParser {
  static readonly KNOWN_POS = new Set<string>(Object.values(Pos))

  constructor(private readonly cleaner: DefinitionCleaner = new DefinitionCleaner()) {}

  parse(payload: unknown): DefinitionResult | null {
    if (!Array.isArray(payload)) return null
    const entries = payload as ApiEntry[]
    const senses = this.groupByPos(entries)
    return Object.keys(senses).length === 0 ? null : { ipa: this.pickIpa(entries), senses }
  }

  pickIpa(entries: ApiEntry[]): string | undefined {
    const texts = entries.flatMap(entry => [entry.phonetic, ...(entry.phonetics ?? []).map(p => p.text)])
    const usable = texts.filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
    const found = usable.find(text => !PipelineConstants.IPA_REGIONAL.test(text)) ?? usable[0]
    return found?.trim().replace(PipelineConstants.IPA_WRAP, '')
  }

  private groupByPos(entries: ApiEntry[]): SenseGroups {
    const byPos: SenseGroups = {}
    for (const meaning of entries.flatMap(entry => entry.meanings ?? [])) {
      const pos = (meaning.partOfSpeech ?? '').toLowerCase()
      if (!DictionaryApiParser.KNOWN_POS.has(pos)) continue
      const cleaned = (meaning.definitions ?? []).map(d => this.cleaner.clean(d.definition)).filter((t): t is string => t !== null)
      if (cleaned.length > 0) byPos[pos] = [...(byPos[pos] ?? []), ...cleaned]
    }
    return byPos
  }
}
