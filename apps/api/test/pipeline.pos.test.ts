import { describe, expect, it } from 'vitest'
import { PosEvidence } from '../data/scripts/pipeline/PosEvidence'
import { SenseSelector } from '../data/scripts/pipeline/SenseSelector'

describe('PosEvidence', () => {
  const evidence = new PosEvidence()

  it('scores verb usage after to and pronouns', () => {
    const scores = evidence.score('put', [{ prev: 'to', token: 'put' }, { prev: 'i', next: 'it', token: 'put' }])
    expect(scores.verb).toBe(2)
  })

  it('scores noun usage after determiners when the phrase ends', () => {
    const scores = evidence.score('book', [{ prev: 'the', token: 'book' }, { prev: 'a', next: 'on', token: 'book' }])
    expect(scores.noun).toBe(2)
  })

  it('scores adjective usage before a content word', () => {
    expect(evidence.score('new', [{ prev: 'a', next: 'car', token: 'new' }]).adjective).toBe(1)
  })
})

describe('SenseSelector ordering', () => {
  it('puts closed-class pos first, then orders open pos by evidence', () => {
    const senses = { noun: ['A right to sell something.'], verb: ['To place something somewhere.'], preposition: ['Inside a place.'] }
    const picked = new SenseSelector().select(senses, { verb: 5, noun: 1 })
    expect(picked.map(d => d.pos)).toEqual(['preposition', 'verb', 'noun'])
  })

  it('prefers plain senses over labelled or very short ones', () => {
    const senses = { noun: ['(slang) A thing.', 'A full house.', 'A small vehicle that people travel in.'] }
    expect(new SenseSelector().select(senses)[0].text).toBe('A small vehicle that people travel in.')
  })
})
