import { describe, expect, it } from 'vitest'
import { ExtendedSentenceFilter } from '../data/scripts/pipeline/ExtendedSentenceFilter'
import { SentenceFilter } from '../data/scripts/pipeline/SentenceFilter'

describe('ExtendedSentenceFilter', () => {
  const filter = new ExtendedSentenceFilter()

  it('keeps ordinary sentences', () => {
    expect(filter.isEligible('She walked slowly across the quiet courtyard this morning.')).toBe(true)
  })

  it('rejects explicit or violent vocabulary the core filter allows', () => {
    const text = 'He has difficulty with an enlarged prostate and sexual health issues.'
    expect(new SentenceFilter().isEligible(text)).toBe(true)
    expect(filter.isEligible(text)).toBe(false)
  })
})

describe('SentenceFilter.plainTokens', () => {
  const filter = new SentenceFilter()

  it('ignores capitalised words in mid-sentence position (names) but keeps the first word', () => {
    const plain = filter.plainTokens('Wade stayed home because Wade was ill and the wade was deep.')
    expect(plain.has('wade')).toBe(true)
    expect(filter.plainTokens('I am surprised Wade is here today.').has('wade')).toBe(false)
  })
})
