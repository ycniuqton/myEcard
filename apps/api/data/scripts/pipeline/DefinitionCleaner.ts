import { PipelineLimits } from './PipelineConfig'

/** Normalises one raw gloss, rejects noisy senses and scores how core a sense looks. */
export class DefinitionCleaner {
  static readonly NOISE = /^(\(?(obsolete|archaic|rare|dated|nonstandard|eye dialect)\)?[\s,:]|alternative |alternate |misspelling|plural of|simple past|past participle|present participle|third-person|comparative form|superlative form|inflection of|synonym of|initialism|abbreviation of|contraction of|obsolete form|informal form|dated form|form of|the name of the|\(heading\)|\.\.\.)/i
  static readonly REJECT_ANYWHERE = /wiktionary|wmf|programming language|latin.script|cyrillic|:$/i
  static readonly LEADING_LABEL = /^\(/
  static readonly SPACES = /\s+/g
  static readonly WORD_SPLIT = ' '
  static readonly SENSE_SPLIT = ';'
  static readonly MIN_SPLIT_CHARS = 15
  static readonly SHORT_GLOSS_WORDS = 3

  clean(raw: string | undefined): string | null {
    const text = (raw ?? '').replace(DefinitionCleaner.SPACES, ' ').trim()
    if (!text || DefinitionCleaner.NOISE.test(text) || DefinitionCleaner.REJECT_ANYWHERE.test(text)) return null
    if (text.length <= PipelineLimits.MaxDefinitionChars) return text
    const head = text.split(DefinitionCleaner.SENSE_SPLIT)[0].trim()
    return head.length >= DefinitionCleaner.MIN_SPLIT_CHARS && head.length <= PipelineLimits.MaxDefinitionChars ? head : null
  }

  penalty(text: string): number {
    const labelled = DefinitionCleaner.LEADING_LABEL.test(text) ? 1 : 0
    const short = text.split(DefinitionCleaner.WORD_SPLIT).length <= DefinitionCleaner.SHORT_GLOSS_WORDS ? 1 : 0
    return labelled + short
  }
}
