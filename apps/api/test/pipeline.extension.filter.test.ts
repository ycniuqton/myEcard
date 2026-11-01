import { describe, expect, it } from 'vitest'
import { CandidateFilter } from '../data/scripts/pipeline/CandidateFilter'
import { AbbreviationRule, NumeralRule, OffensiveRule, ShapeRule } from '../data/scripts/pipeline/CandidateRules'
import { CapitalisationStats } from '../data/scripts/pipeline/CapitalisationStats'
import { RejectReason } from '../data/scripts/pipeline/ExtensionConfig'
import { Lemmatiser } from '../data/scripts/pipeline/Lemmatiser'

function statsWith(sentences: string[]): CapitalisationStats {
  const stats = new CapitalisationStats()
  sentences.forEach(sentence => stats.addText(sentence))
  return stats
}

describe('candidate rules', () => {
  it('rejects contractions, hyphens, digits, accents and vowel-less strings', () => {
    const rule = new ShapeRule()
    for (const lemma of ["don't", 'ice-cream', 'abc1', 'café', 'ph', 'brr', 'a']) expect(rule.reject(lemma)).toBe(RejectReason.Shape)
    expect(rule.reject('zebra')).toBeNull()
  })

  it('rejects numerals, abbreviations and offensive words', () => {
    expect(new NumeralRule().reject('fifteen')).toBe(RejectReason.Numeral)
    expect(new AbbreviationRule().reject('etc')).toBe(RejectReason.Abbreviation)
    expect(new OffensiveRule().reject('porn')).toBe(RejectReason.Offensive)
    expect(new OffensiveRule().reject('teacher')).toBeNull()
  })
})

describe('CapitalisationStats', () => {
  const sentences = Array.from({ length: 6 }, (_, i) => `On day ${i} we saw Boston and a big bank near Boston.`)

  it('flags words that are almost always capitalised mid-sentence', () => {
    const stats = statsWith(sentences)
    expect(stats.isProperNoun('boston')).toBe(true)
    expect(stats.isProperNoun('bank')).toBe(false)
  })

  it('needs enough evidence and ignores sentence-initial capitals', () => {
    const stats = statsWith(['Bank is closed today.', 'Bank is open now.', 'I saw Rome once.'])
    expect(stats.isProperNoun('bank')).toBe(false)
    expect(stats.isProperNoun('rome')).toBe(false)
  })
})

describe('Lemmatiser', () => {
  const lemmatiser = new Lemmatiser()

  it('proposes plural and verb bases', () => {
    expect(lemmatiser.basesOf('studies')).toContain('study')
    expect(lemmatiser.basesOf('boxes')).toContain('box')
    expect(lemmatiser.basesOf('stopped')).toContain('stop')
    expect(lemmatiser.basesOf('making')).toContain('make')
  })

  it('does not strip a plain -ss word to a shorter base', () => {
    expect(lemmatiser.basesOf('glass')).not.toContain('glas')
  })
})

describe('CandidateFilter', () => {
  const stats = statsWith(Array.from({ length: 6 }, () => 'We met Obama and Obama there.'))
  const coreForms = new Set(['run', 'ran', 'runs', 'running', 'book', 'books'])
  const coreLemmas = new Set(['run', 'book'])
  const candidates = ['ran', 'books', 'booked', 'zebra', 'zebras', 'obama', 'fifteen', 'fuck', "can't", 'lantern', 'running'].map(
    (lemma, index) => ({ lemma, frequency: 100 - index }),
  )

  it('dedupes against NGSL lemmas and forms, drops the unwanted and keeps order', () => {
    const report = CandidateFilter.standard(stats, coreForms, coreLemmas).filter(candidates)
    expect(report.accepted).toEqual(['zebra', 'lantern'])
    expect(report.rejected.get(RejectReason.Known)).toBe(3)
    expect(report.rejected.get(RejectReason.InflectionOfKnown)).toBe(2)
    expect(report.rejected.get(RejectReason.ProperNoun)).toBe(1)
    expect(report.rejected.get(RejectReason.Numeral)).toBe(1)
    expect(report.rejected.get(RejectReason.Offensive)).toBe(1)
    expect(report.rejected.get(RejectReason.Shape)).toBe(1)
  })

  it('does not mutate the core sets it was built from', () => {
    CandidateFilter.standard(stats, coreForms, coreLemmas).filter(candidates)
    expect(coreLemmas.has('zebra')).toBe(false)
  })
})
