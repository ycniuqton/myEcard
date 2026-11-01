import { DefinitionCleaner } from './DefinitionCleaner'

/** Cleaner for extension words: also drops cross-references and archaic, dialectal or regional glosses. */
export class StrictDefinitionCleaner extends DefinitionCleaner {
  static readonly CROSS_REFERENCE = /\b(plural|singular|past tense|past participle|present participle|alternative (form|spelling|case form)|misspelling|obsolete (form|spelling)|archaic (form|spelling)|dated (form|spelling)|eye dialect|nonstandard (form|spelling)|variant (form|spelling)|clipping|abbreviation|initialism|acronym|diminutive|genitive|comparative|superlative|gerund|inflection|standard spelling|dialectal|dialect form|pronunciation spelling|ellipsis|contraction|romanization|romanisation|combining form|alternative) (of|for)\b/i
  static readonly LEADING_REFERENCE = /^(short for|abbreviation|initialism|acronym|contraction|clipping)\b/i
  static readonly REFERENCE_WINDOW = 70
  static readonly REJECTED_LABEL = /^\([^)]*\b(obsolete|archaic|dialectal|dialect|rare|nonstandard|vulgar|offensive|derogatory|slur|pejorative|Scotland|Scots|Ireland|Northern England|historical)\b[^)]*\)/i

  clean(raw: string | undefined): string | null {
    const text = super.clean(raw)
    if (text === null) return null
    const head = text.slice(0, StrictDefinitionCleaner.REFERENCE_WINDOW)
    if (StrictDefinitionCleaner.LEADING_REFERENCE.test(text) || StrictDefinitionCleaner.CROSS_REFERENCE.test(head) || StrictDefinitionCleaner.REJECTED_LABEL.test(text)) return null
    return text
  }
}
