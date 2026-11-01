import { describe, expect, it } from 'vitest'
import { DictionaryApiParser } from '../data/scripts/pipeline/DictionaryApiParser'
import { ExtendedSenseSelector } from '../data/scripts/pipeline/ExtendedSenseSelector'
import { StrictDefinitionCleaner } from '../data/scripts/pipeline/StrictDefinitionCleaner'

describe('StrictDefinitionCleaner', () => {
  const cleaner = new StrictDefinitionCleaner()

  it('rejects cross-references and archaic or dialectal glosses', () => {
    const rejected = [
      'plural of cat', 'Alternative form of colour', 'misspelling of receive', 'Obsolete spelling of fancy',
      '(dialectal) A small stream', '(archaic) A messenger', 'Eye dialect spelling of because', 'Short for television set',
      '(Scotland) A hill', 'past participle of break',
    ]
    for (const text of rejected) expect(cleaner.clean(text), text).toBeNull()
  })

  it('keeps ordinary learner senses', () => {
    expect(cleaner.clean('A set of questions that checks what someone knows.')).not.toBeNull()
    expect(cleaner.clean('(informal) Very good or enjoyable.')).not.toBeNull()
  })

  it('removes cross-references when parsing a dictionary payload so a better sense wins', () => {
    const payload = [{ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'plural of lamp' }, { definition: 'A thing that gives light.' }] }] }]
    expect(new DictionaryApiParser(cleaner).parse(payload)?.senses.noun).toEqual(['A thing that gives light.'])
  })
})

describe('ExtendedSenseSelector', () => {
  const plain = ['a', 'to', 'the', 'of', 'in', 'what', 'someone', 'knows', 'check', 'challenge', 'trial', 'exam', 'test', 'given', 'at', 'school']

  function selector(): ExtendedSenseSelector {
    const instance = new ExtendedSenseSelector()
    instance.learn(plain)
    return instance
  }

  it('puts the part of speech used most in context first and keeps source order', () => {
    const senses = { noun: ['A challenge, trial.', 'A check of what someone knows.'], verb: ['To check what someone knows.'] }
    const picked = selector().select(senses, { noun: 1, verb: 5, adjective: 0 })
    expect(picked.map(d => d.pos)).toEqual(['verb', 'noun'])
    expect(picked[0].text).toBe('To check what someone knows.')
  })

  it('keeps the first sense first instead of promoting short or odd glosses', () => {
    const senses = { noun: ['A challenge, trial.', 'A cupel hearth where precious metals are refined by cupellation.'] }
    expect(selector().select(senses, { noun: 3, verb: 0, adjective: 0 })[0].text).toBe('A challenge, trial.')
  })

  it('demotes specialist labelled and jargon-heavy glosses below plain ones', () => {
    const senses = { noun: ['A cupel hearth where precious metals are refined by cupellation.', '(chemistry) A reagent.', 'An exam given at school.'] }
    const picked = selector().select(senses, { noun: 2, verb: 0, adjective: 0 })
    expect(picked[0].text).toBe('An exam given at school.')
  })

  it('limits parts of speech and senses per part of speech', () => {
    const senses = { noun: ['A one.', 'A two.', 'A three.'], verb: ['To one.', 'To two.'], adjective: ['A one adj.'] }
    const picked = selector().select(senses, { noun: 3, verb: 2, adjective: 1 })
    expect(picked.map(d => d.pos)).toEqual(['noun', 'noun', 'verb'])
  })

  it('works without evidence by using source order', () => {
    expect(selector().select({ adverb: ['In a quick way.'], noun: ['A thing.'] }).map(d => d.pos)).toContain('adverb')
  })
})

describe('ExtendedSenseSelector secondary senses', () => {
  function selector(): ExtendedSenseSelector {
    const instance = new ExtendedSenseSelector()
    instance.learn(['a', 'to', 'the', 'of', 'in', 'way', 'thing', 'make', 'light'])
    return instance
  }

  it('drops a second part of speech that has no support in context', () => {
    const senses = { adjective: ['A thorough way of doing a thing.', 'Very complete in every way.'], preposition: ['Through.'] }
    const picked = selector().select(senses, { noun: 0, verb: 0, adjective: 4 })
    expect(picked.map(d => d.pos)).toEqual(['adjective', 'adjective'])
  })

  it('does not add a heavy labelled extra sense after the first', () => {
    const senses = { adverb: ['In a quiet way.', '(of an edit) without explicit acknowledgment by a committee'] }
    expect(selector().select(senses, { noun: 0, verb: 0, adjective: 0 })).toHaveLength(1)
  })
})
