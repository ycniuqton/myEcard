import { PipelineConstants } from './PipelineConstants'
import { DefinitionCleaner } from './DefinitionCleaner'
import type { DefinitionResult, SenseGroups } from './types'

type KaikkiSense = { glosses?: string[]; tags?: string[] }
type KaikkiSound = { ipa?: string }
type KaikkiEntry = { word?: string; pos?: string; senses?: KaikkiSense[]; sounds?: KaikkiSound[] }

/** Turns a kaikki.org Wiktionary JSONL page into IPA plus a few clean definitions. */
export class KaikkiParser {
  static readonly POS_MAP: Record<string, string> = {
    noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction',
    pron: 'pronoun', det: 'determiner', intj: 'interjection', num: 'numeral', article: 'article',
  }
  static readonly SKIP_TAGS = new Set(['obsolete', 'archaic', 'rare', 'dated', 'nonstandard', 'form-of', 'alt-of', 'misspelling', 'vulgar', 'offensive'])
  static readonly LINE_BREAK = /\r?\n/

  constructor(private readonly cleaner: DefinitionCleaner = new DefinitionCleaner()) {}

  parse(jsonl: string, lemma: string): DefinitionResult | null {
    const entries = this.entries(jsonl).filter(entry => entry.word?.toLowerCase() === lemma)
    const senses = this.senses(entries)
    return Object.keys(senses).length === 0 ? null : { ipa: this.ipa(entries), senses }
  }

  private entries(jsonl: string): KaikkiEntry[] {
    return jsonl.split(KaikkiParser.LINE_BREAK).filter(Boolean).map(line => JSON.parse(line) as KaikkiEntry)
  }

  private ipa(entries: KaikkiEntry[]): string | undefined {
    const all = entries.flatMap(entry => entry.sounds ?? []).map(sound => sound.ipa).filter((ipa): ipa is string => !!ipa)
    const found = all.find(ipa => !PipelineConstants.IPA_REGIONAL.test(ipa)) ?? all[0]
    return found?.trim().replace(PipelineConstants.IPA_WRAP, '')
  }

  private senses(entries: KaikkiEntry[]): SenseGroups {
    const groups: SenseGroups = {}
    for (const entry of entries) {
      const pos = KaikkiParser.POS_MAP[entry.pos ?? '']
      const glosses = this.glosses(entry)
      if (pos && glosses.length > 0) groups[pos] = [...(groups[pos] ?? []), ...glosses]
    }
    return groups
  }

  private glosses(entry: KaikkiEntry): string[] {
    return (entry.senses ?? [])
      .filter(sense => !(sense.tags ?? []).some(tag => KaikkiParser.SKIP_TAGS.has(tag)))
      .map(sense => this.cleaner.clean((sense.glosses ?? []).at(-1)))
      .filter((text): text is string => text !== null)
  }
}
