import { describe, expect, it } from 'vitest'
import { Status, type Word } from '@wordmap/shared'
import { TextFold, WordIndex } from './WordIndex'

function word(rank: number, lemma: string, vi?: string): Word {
  return { id: `w${rank}`, lemma, rank, band: 1, pos: ['noun'], definitions: [{ pos: 'noun', text: `def ${lemma}` }], vi, examples: [], listIds: [] }
}

const WORDS = [word(1, 'house', 'nhà, nhà ở'), word(2, 'beautiful', 'đẹp, xinh đẹp'), word(3, 'plain')]
const LIMIT = 10
const status = () => Status.Unknown

describe('WordIndex Vietnamese search', () => {
  it('folds accents and the d-stroke', () => {
    expect(TextFold.fold('Đẹp Nhà')).toBe('dep nha')
  })

  it('finds a word by its Vietnamese meaning with or without accents', () => {
    const index = new WordIndex(WORDS)
    expect(index.search('đẹp', LIMIT, status).map(h => h.lemma)).toEqual(['beautiful'])
    expect(index.search('dep', LIMIT, status).map(h => h.lemma)).toEqual(['beautiful'])
    expect(index.search('nha o', LIMIT, status).map(h => h.lemma)).toEqual(['house'])
  })

  it('puts the Vietnamese meaning first in the hit text and keeps English only when absent', () => {
    const hits = new WordIndex(WORDS).search('p', LIMIT, status)
    expect(hits.find(h => h.lemma === 'plain')?.definition).toBe('def plain')
    expect(new WordIndex(WORDS).search('house', LIMIT, status)[0].definition).toBe('nhà, nhà ở — def house')
  })

  it('still ranks lemma matches before Vietnamese matches', () => {
    const index = new WordIndex([word(1, 'dep-test'), word(2, 'beautiful', 'đẹp')])
    expect(index.search('dep', LIMIT, status).map(h => h.lemma)).toEqual(['dep-test', 'beautiful'])
  })
})
