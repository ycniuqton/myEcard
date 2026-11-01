import { RejectReason, ExtensionLimits } from './ExtensionConfig'
import type { CapitalisationStats } from './CapitalisationStats'
import { Lemmatiser } from './Lemmatiser'

/** Base of every single-purpose reason to refuse a candidate lemma. */
export abstract class CandidateRule {
  abstract reject(lemma: string): RejectReason | null
}

/** Only plain lowercase ASCII words: no hyphens, apostrophes, digits or accents (contractions, non-English tokens). */
export class ShapeRule extends CandidateRule {
  static readonly PLAIN_WORD = /^[a-z]+$/
  static readonly HAS_VOWEL = /[aeiouy]/

  reject(lemma: string): RejectReason | null {
    const plain = ShapeRule.PLAIN_WORD.test(lemma) && ShapeRule.HAS_VOWEL.test(lemma)
    return plain && lemma.length >= ExtensionLimits.MinLemmaLength ? null : RejectReason.Shape
  }
}

/** Number words and ordinals do not belong on a vocabulary map. */
export class NumeralRule extends CandidateRule {
  static readonly WORDS = new Set([
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
    'ninety', 'hundred', 'thousand', 'million', 'billion', 'trillion', 'dozen', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
    'ninth', 'tenth', 'eleventh', 'twelfth', 'twentieth', 'thirtieth', 'hundredth', 'thousandth', 'millionth', 'third', 'second',
  ])

  reject(lemma: string): RejectReason | null {
    return NumeralRule.WORDS.has(lemma) ? RejectReason.Numeral : null
  }
}

/** Abbreviations, initialisms and interjection spellings that are not vocabulary. */
export class AbbreviationRule extends CandidateRule {
  static readonly KNOWN = new Set([
    'mrs', 'etc', 'inc', 'ltd', 'corp', 'fig', 'anon', 'par', 'dept', 'govt', 'approx', 'esp', 'info', 'tel', 'fax', 'mph', 'pdf',
    'dna', 'rna', 'cpu', 'usa', 'ceo', 'bbc', 'cnn', 'nasa', 'nato', 'aids', 'hiv', 'url', 'html', 'gps', 'atm', 'asap', 'dvd',
    'hmm', 'ugh', 'wow', 'yeah', 'yep', 'nope', 'huh', 'gonna', 'gotta', 'wanna', 'okay',
  ])

  reject(lemma: string): RejectReason | null {
    return AbbreviationRule.KNOWN.has(lemma) ? RejectReason.Abbreviation : null
  }
}

/** Sexual, slur and similar words a learner map should not push. */
export class OffensiveRule extends CandidateRule {
  static readonly WORDS = new Set([
    'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'bitch', 'dick', 'cock', 'pussy', 'penis', 'vagina', 'porn', 'pornography', 'rape',
    'rapist', 'whore', 'slut', 'bastard', 'nigger', 'nigga', 'fag', 'faggot', 'cunt', 'tit', 'boob', 'anal', 'semen', 'sperm',
    'orgasm', 'masturbate', 'masturbation', 'erection', 'genital', 'prostitute', 'prostitution', 'nazi', 'suicide', 'terrorism',
    'terrorist', 'damn', 'ass', 'asshole', 'retard', 'cum', 'dildo', 'fetish', 'incest', 'molest', 'pedophile', 'bondage',
    'hooker', 'pimp', 'crap', 'piss', 'bollocks', 'wank', 'sex', 'sexy', 'nude', 'naked', 'nipple', 'horny', 'kinky',
  ])

  reject(lemma: string): RejectReason | null {
    return OffensiveRule.WORDS.has(lemma) ? RejectReason.Offensive : null
  }
}

/** Words capitalised in the middle of Tatoeba sentences almost every time are names. */
export class ProperNounRule extends CandidateRule {
  constructor(private readonly stats: CapitalisationStats) {
    super()
  }

  reject(lemma: string): RejectReason | null {
    return this.stats.isProperNoun(lemma) ? RejectReason.ProperNoun : null
  }
}

/** Rejects words that equal, or inflect from, a lemma or form that already has a place on the map. */
export class KnownFormRule extends CandidateRule {
  private readonly lemmatiser = new Lemmatiser()

  constructor(private readonly known: Set<string>, private readonly lemmas: Set<string>) {
    super()
  }

  reject(lemma: string): RejectReason | null {
    if (this.known.has(lemma)) return RejectReason.Known
    return this.lemmatiser.basesOf(lemma).some(base => this.lemmas.has(base)) ? RejectReason.InflectionOfKnown : null
  }
}
