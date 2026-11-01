import type { RawCandidate } from './CandidateReader'
import type { CapitalisationStats } from './CapitalisationStats'
import {
  AbbreviationRule, type CandidateRule, KnownFormRule, NumeralRule, OffensiveRule, ProperNounRule, ShapeRule,
} from './CandidateRules'
import type { RejectReason } from './ExtensionConfig'

export type FilterReport = { accepted: string[]; rejected: Map<RejectReason, number> }

/** Applies the candidate rules in order; accepted lemmas join the known set so later inflections are deduplicated. */
export class CandidateFilter {
  constructor(
    private readonly rules: CandidateRule[],
    private readonly known: Set<string>,
    private readonly lemmas: Set<string>,
  ) {}

  static standard(stats: CapitalisationStats, coreForms: Set<string>, coreLemmas: Set<string>): CandidateFilter {
    const known = new Set(coreForms)
    const lemmas = new Set(coreLemmas)
    const rules = [
      new ShapeRule(), new NumeralRule(), new AbbreviationRule(), new OffensiveRule(),
      new ProperNounRule(stats), new KnownFormRule(known, lemmas),
    ]
    return new CandidateFilter(rules, known, lemmas)
  }

  evaluate(lemma: string): RejectReason | null {
    for (const rule of this.rules) {
      const reason = rule.reject(lemma)
      if (reason !== null) return reason
    }
    return null
  }

  filter(candidates: RawCandidate[]): FilterReport {
    const accepted: string[] = []
    const rejected = new Map<RejectReason, number>()
    for (const candidate of candidates) {
      const reason = this.evaluate(candidate.lemma)
      if (reason === null) this.accept(candidate.lemma, accepted)
      else rejected.set(reason, (rejected.get(reason) ?? 0) + 1)
    }
    return { accepted, rejected }
  }

  private accept(lemma: string, accepted: string[]): void {
    accepted.push(lemma)
    this.known.add(lemma)
    this.lemmas.add(lemma)
  }
}
