import { describe, expect, it } from 'vitest'
import { DictionaryApiParser } from '../data/scripts/pipeline/DictionaryApiParser'
import { ExampleSource, GapKind } from '../data/scripts/pipeline/PipelineConfig'
import { SenseSelector } from '../data/scripts/pipeline/SenseSelector'
import type { WordRecord } from '../data/scripts/pipeline/types'
import { Validator } from '../data/scripts/pipeline/Validator'
import { WordIdentity } from '../data/scripts/pipeline/WordIdentity'

function word(rank: number, lemma: string, full = true): WordRecord {
  return {
    id: WordIdentity.idFor(rank), lemma, rank, band: WordIdentity.bandFor(rank), pos: ['noun'], listIds: ['ngsl'],
    definitions: full ? [{ pos: 'noun', text: 'a thing' }] : [],
    examples: full ? [{ text: 'This is a thing here.', source: ExampleSource.Custom }] : [],
  }
}

describe('Validator', () => {
  const validator = new Validator()

  it('passes a contiguous complete list', () => {
    const report = validator.validate([word(1, 'a'), word(2, 'b')], 2)
    expect(report.errors).toEqual([])
    expect(report.gaps).toEqual([])
  })

  it('reports definition and example gaps with rank', () => {
    const gaps = validator.gaps([word(1, 'a'), word(2, 'b', false)])
    expect(gaps).toEqual([
      { lemma: 'b', rank: 2, gap: GapKind.Definition },
      { lemma: 'b', rank: 2, gap: GapKind.Example },
    ])
  })

  it('detects wrong count, rank holes, bad band and duplicate lemmas', () => {
    const broken = [word(1, 'a'), { ...word(3, 'a'), band: 9 }]
    const errors = validator.validate(broken, 3).errors.join('|')
    expect(errors).toContain('expected 3 words')
    expect(errors).toContain('rank 3, expected 2')
    expect(errors).toContain('bad band')
    expect(errors).toContain('duplicate lemma')
  })

  it('computes ids and bands', () => {
    expect(WordIdentity.idFor(42)).toBe('ngsl:0042')
    expect(WordIdentity.bandFor(100)).toBe(1)
    expect(WordIdentity.bandFor(101)).toBe(2)
  })
})

describe('DictionaryApiParser', () => {
  const parser = new DictionaryApiParser()
  const payload = [{
    phonetic: '/əˈbæn.dən/',
    meanings: [
      { partOfSpeech: 'verb', definitions: [
        { definition: 'Obsolete form of something.' },
        { definition: 'To leave behind; to desert.' },
        { definition: 'To give up completely.' },
        { definition: 'Third one is dropped.' },
      ] },
      { partOfSpeech: 'noun', definitions: [{ definition: 'A complete lack of inhibition.' }] },
      { partOfSpeech: 'prefix', definitions: [{ definition: 'ignored' }] },
    ],
  }]

  it('drops noise senses, ignores unknown pos, strips IPA slashes', () => {
    const result = parser.parse(payload)
    expect(result?.ipa).toBe('əˈbæn.dən')
    expect(Object.keys(result?.senses ?? {})).toEqual(['verb', 'noun'])
    expect(result?.senses.verb[0]).toBe('To leave behind; to desert.')
  })

  it('selects two senses for the first pos and one for the others', () => {
    const picked = new SenseSelector().select(parser.parse(payload)?.senses ?? {})
    expect(picked.map(d => d.pos)).toEqual(['verb', 'verb', 'noun'])
  })

  it('returns null for non-array or empty payloads', () => {
    expect(parser.parse({ title: 'No Definitions Found' })).toBeNull()
    expect(parser.parse([])).toBeNull()
  })
})
