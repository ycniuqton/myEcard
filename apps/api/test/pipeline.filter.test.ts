import { describe, expect, it } from 'vitest'
import { SentenceFilter } from '../data/scripts/pipeline/SentenceFilter'

const vocab = new Set(['she', 'wants', 'to', 'be', 'a', 'doctor', 'when', 'grows', 'up', 'the', 'book', 'is', 'on', 'table'])

describe('SentenceFilter', () => {
  const filter = new SentenceFilter()

  it('accepts a clean 6-15 word sentence', () => {
    expect(filter.isEligible('She wants to be a doctor when she grows up.')).toBe(true)
  })

  it('rejects too short and too long sentences', () => {
    expect(filter.isEligible('I like it.')).toBe(false)
    expect(filter.isEligible('This is a sentence that goes on and on and on and on and on and on and on.')).toBe(false)
  })

  it('rejects digits, quotes and missing terminal punctuation or capital', () => {
    expect(filter.isEligible('She wants to be a doctor in 2030 for sure.')).toBe(false)
    expect(filter.isEligible('She said "I want to be a doctor" to everyone.')).toBe(false)
    expect(filter.isEligible('She wants to be a doctor when she grows up')).toBe(false)
    expect(filter.isEligible('she wants to be a doctor when she grows up.')).toBe(false)
  })

  it('rejects blocked words', () => {
    expect(filter.isEligible('That was a really stupid idea that he had today.')).toBe(false)
  })

  it('tokenizes contractions and curly apostrophes', () => {
    expect(filter.tokenize("Don’t go, Tom's here.")).toEqual(["don't", 'go', "tom's", 'here'])
  })

  it('computes NGSL coverage with names counted as covered', () => {
    expect(filter.coverage('She wants to be a doctor.', vocab)).toBe(1)
    expect(filter.coverage('She wants to be a zebra.', vocab)).toBeCloseTo(5 / 6)
    expect(filter.coverage('Today Tom is on the table.', vocab)).toBeCloseTo(5 / 6)
  })
})
