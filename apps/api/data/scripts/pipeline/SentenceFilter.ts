import { PipelineLimits } from './PipelineConfig'

enum RegexFlag {
  IgnoreCase = 'i',
  GlobalIgnoreCase = 'gi',
}

/** Pure rules deciding whether a Tatoeba sentence is a good learner example. */
export class SentenceFilter {
  static readonly APOSTROPHE = "'"
  static readonly PRONOUN_I = 'i'
  static readonly TOKEN = new RegExp("[a-z]+(?:'[a-z]+)*", RegexFlag.GlobalIgnoreCase)
  static readonly CURLY_APOSTROPHE = /[‘’]/g
  static readonly STARTS_UPPER = /^[A-Z]/
  static readonly ENDS_SENTENCE = /[.?!]$/
  static readonly FORBIDDEN_CHARS = new RegExp('[0-9()[\\]"@/\\\\<>_*#]|https?:|www\\.', RegexFlag.IgnoreCase)
  static readonly NEGATION_SUFFIX = "n't"
  static readonly POSSESSIVE_SPLIT = SentenceFilter.APOSTROPHE
  static readonly BLOCKED = new Set(['fuck', 'fucking', 'fucked', 'shit', 'bitch', 'dick', 'porn', 'rape', 'raped', 'nazi', 'nazis', 'suicide', 'damn', 'ass', 'asshole', 'bastard', 'slut', 'whore', 'cock', 'pussy', 'penis', 'vagina', 'nigger', 'retard', 'terrorist', 'terrorists', 'murder', 'murdered', 'cum', 'orgasm', 'masturbate', 'naked', 'drunk', 'stupid'])

  tokenize(text: string): string[] {
    return (text.replace(SentenceFilter.CURLY_APOSTROPHE, SentenceFilter.APOSTROPHE).match(SentenceFilter.TOKEN) ?? []).map(token => token.toLowerCase())
  }

  plainTokens(text: string): Set<string> {
    const raw = text.replace(SentenceFilter.CURLY_APOSTROPHE, SentenceFilter.APOSTROPHE).match(SentenceFilter.TOKEN) ?? []
    const plain = raw.filter((token, index) => index === 0 || token === token.toLowerCase())
    return new Set(plain.map(token => token.toLowerCase()))
  }

  isEligible(text: string): boolean {
    const normalized = text.replace(SentenceFilter.CURLY_APOSTROPHE, SentenceFilter.APOSTROPHE).trim()
    if (!SentenceFilter.STARTS_UPPER.test(normalized) || !SentenceFilter.ENDS_SENTENCE.test(normalized)) return false
    if (SentenceFilter.FORBIDDEN_CHARS.test(normalized)) return false
    const tokens = this.tokenize(normalized)
    const inRange = tokens.length >= PipelineLimits.MinSentenceWords && tokens.length <= PipelineLimits.MaxSentenceWords
    return inRange && !tokens.some(token => SentenceFilter.BLOCKED.has(token))
  }

  coverage(text: string, vocabulary: Set<string>): number {
    const raw = text.replace(SentenceFilter.CURLY_APOSTROPHE, SentenceFilter.APOSTROPHE).match(SentenceFilter.TOKEN) ?? []
    if (raw.length === 0) return 0
    const covered = raw.filter((token, index) => this.isCovered(token, index, vocabulary))
    return covered.length / raw.length
  }

  private isCovered(token: string, index: number, vocabulary: Set<string>): boolean {
    const lower = token.toLowerCase()
    if (vocabulary.has(lower) || lower === SentenceFilter.PRONOUN_I) return true
    if (index > 0 && SentenceFilter.STARTS_UPPER.test(token)) return true
    if (lower.endsWith(SentenceFilter.NEGATION_SUFFIX)) return vocabulary.has(lower.slice(0, -SentenceFilter.NEGATION_SUFFIX.length))
    return lower.includes(SentenceFilter.POSSESSIVE_SPLIT) && vocabulary.has(lower.split(SentenceFilter.POSSESSIVE_SPLIT)[0])
  }
}
