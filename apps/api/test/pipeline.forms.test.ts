import { describe, expect, it } from 'vitest'
import { FormsGenerator } from '../data/scripts/pipeline/FormsGenerator'
import { Pos } from '../data/scripts/pipeline/PipelineConfig'

describe('FormsGenerator', () => {
  const gen = new FormsGenerator()

  it('generates regular verb forms', () => {
    expect(gen.generate('decide', [Pos.Verb], undefined)).toEqual(['decides', 'decided', 'deciding'])
  })

  it('doubles the final consonant of short CVC verbs', () => {
    expect(gen.generate('stop', [Pos.Verb], undefined)).toEqual(expect.arrayContaining(['stopped', 'stopping', 'stops']))
  })

  it('handles consonant + y', () => {
    expect(gen.generate('carry', [Pos.Verb], undefined)).toEqual(expect.arrayContaining(['carries', 'carried', 'carrying']))
  })

  it('pluralises nouns including sibilants', () => {
    expect(gen.generate('box', [Pos.Noun], undefined)).toEqual(['boxes'])
    expect(gen.generate('city', [Pos.Noun], undefined)).toEqual(['cities'])
  })

  it('generates adjective comparatives', () => {
    expect(gen.generate('large', [Pos.Adjective], undefined)).toEqual(['larger', 'largest'])
    expect(gen.generate('big', [Pos.Adjective], undefined)).toEqual(['bigger', 'biggest'])
  })

  it('does not inflect closed-class words', () => {
    expect(gen.generate('the', [Pos.Noun], ['the'])).toEqual([])
    expect(gen.generate('about', [Pos.Preposition], undefined)).toEqual([])
  })

  it('drops contraction stubs and dialect spellings from listed forms', () => {
    const forms = gen.generate('do', [Pos.Verb], ['do', 'does', 'don', 'doesn', 'didn', 'did', 'doin', 'done'])
    expect(forms).toEqual(['does', 'did', 'done'])
    expect(gen.generate('will', [Pos.Verb], ['will', 'won', 'll'])).toEqual([])
  })

  it('prefers the listed NGSL forms and removes the lemma', () => {
    const forms = gen.generate('be', [Pos.Verb], ['be', 'is', 'are', 'was', 'were', 'been', 'being'])
    expect(forms).toEqual(['is', 'are', 'was', 'were', 'been', 'being'])
  })
})
