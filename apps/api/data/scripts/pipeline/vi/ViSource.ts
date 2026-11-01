import { KaikkiParser } from '../KaikkiParser'
import { ViLimits, ViSourceName, type ViCache, type ViOverrides, type ViWord, type WiktionaryTranslation } from './ViConfig'

/** Base class of every place a Vietnamese meaning can come from. */
export abstract class ViSource {
  abstract readonly name: ViSourceName

  abstract meaningFor(word: ViWord): string | null
}

/** Reviewed or written meanings keyed by word id; they always win. */
export class ViOverrideSource extends ViSource {
  readonly name = ViSourceName.Override

  constructor(private readonly overrides: ViOverrides) {
    super()
  }

  meaningFor(word: ViWord): string | null {
    const meaning = this.overrides[word.id]?.trim()
    return meaning ? meaning : null
  }
}

/** Picks short glosses from the cached Wiktionary translation tables, preferring the word's main part of speech. */
export class ViWiktionarySource extends ViSource {
  static readonly PAREN = /\s*\([^)]*\)/g
  static readonly STRAY_PAREN = /[()]/g
  static readonly SPACES = /\s+/
  static readonly CJK = /[　-鿿가-힯]/

  readonly name = ViSourceName.Wiktionary

  constructor(private readonly cache: ViCache) {
    super()
  }

  meaningFor(word: ViWord): string | null {
    const all = this.cache[word.id] ?? []
    const main = word.definitions[0]?.pos ?? word.pos[0]
    const sameKind = all.filter(t => KaikkiParser.POS_MAP[t.pos] === main)
    const glosses = this.glosses(sameKind.length > 0 ? sameKind : all)
    return glosses.length > 0 ? this.fit(glosses) : null
  }

  private fit(glosses: string[]): string {
    const kept = glosses.reduce<string[]>((acc, gloss) => {
      const next = [...acc, gloss].join(ViLimits.GlossSeparator)
      return acc.length === 0 || next.length <= ViLimits.MaxMeaningChars ? [...acc, gloss] : acc
    }, [])
    return kept.join(ViLimits.GlossSeparator)
  }

  private glosses(translations: WiktionaryTranslation[]): string[] {
    const named = translations.filter(t => typeof t.word === 'string')
    const cleaned = named.map(t => t.word.replace(ViWiktionarySource.PAREN, '').replace(ViWiktionarySource.STRAY_PAREN, '').trim()).filter(g => this.usable(g))
    return [...new Set(cleaned)].slice(0, ViLimits.MaxGlosses)
  }

  private usable(gloss: string): boolean {
    const short = gloss.split(ViWiktionarySource.SPACES).length <= ViLimits.MaxGlossWords
    return gloss.length > 0 && short && !ViWiktionarySource.CJK.test(gloss)
  }
}
