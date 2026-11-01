import { Pos } from './PipelineConfig'
import type { PosEvidenceScores, TokenContext } from './types'

/** Guesses which parts of speech a word is mostly used as, from neighbouring tokens in sentences. */
export class PosEvidence {
  static readonly DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their', 'its', 'some', 'any', 'no', 'every', 'each', 'another'])
  static readonly PREPOSITIONS = new Set(['in', 'on', 'at', 'of', 'for', 'with', 'by', 'from', 'about', 'into', 'to'])
  static readonly VERB_TRIGGERS = new Set(['to', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'will', 'would', 'can', 'could', 'may', 'might', 'must', 'should', 'shall', 'do', 'does', 'did', 'not'])
  static readonly INTENSIFIERS = new Set(['very', 'so', 'too', 'quite', 'rather', 'more', 'most', 'really', 'extremely', 'pretty'])
  static readonly FUNCTION_WORDS = new Set(['of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but', 'is', 'was', 'are', 'were', 'that', 'who', 'which', 'with', 'by', 'from', 'as', 'it', 'he', 'she', 'we', 'they', 'i', 'you'])
  static readonly VERB_SUFFIX = /(ed|ing)$/

  score(lemma: string, contexts: TokenContext[]): PosEvidenceScores {
    const scores: PosEvidenceScores = { [Pos.Noun]: 0, [Pos.Verb]: 0, [Pos.Adjective]: 0 }
    for (const context of contexts) {
      if (this.isVerb(lemma, context)) scores[Pos.Verb]++
      else if (this.isNoun(context)) scores[Pos.Noun]++
      else if (this.isAdjective(context)) scores[Pos.Adjective]++
    }
    return scores
  }

  private isVerb(lemma: string, context: TokenContext): boolean {
    const inflected = context.token !== lemma && PosEvidence.VERB_SUFFIX.test(context.token)
    return inflected || PosEvidence.VERB_TRIGGERS.has(context.prev ?? '')
  }

  private isNoun(context: TokenContext): boolean {
    const prev = context.prev ?? ''
    const opensNoun = PosEvidence.DETERMINERS.has(prev) || PosEvidence.PREPOSITIONS.has(prev)
    return opensNoun && this.endsPhrase(context.next)
  }

  private isAdjective(context: TokenContext): boolean {
    const prev = context.prev ?? ''
    const modifies = PosEvidence.DETERMINERS.has(prev) && !this.endsPhrase(context.next)
    return modifies || PosEvidence.INTENSIFIERS.has(prev)
  }

  private endsPhrase(next: string | undefined): boolean {
    return next === undefined || PosEvidence.FUNCTION_WORDS.has(next)
  }
}
