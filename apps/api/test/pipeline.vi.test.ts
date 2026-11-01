import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { PipelineLimits } from '../data/scripts/pipeline/PipelineConfig'
import { ViLimits, ViSourceName, type ViWord } from '../data/scripts/pipeline/vi/ViConfig'
import { ViManager } from '../data/scripts/pipeline/vi/ViManager'
import { ViOverrideSource, ViWiktionarySource } from '../data/scripts/pipeline/vi/ViSource'

function word(id: string, pos = 'adjective'): ViWord {
  return { id, lemma: id, rank: 1, pos: [pos], definitions: [{ pos, text: 'x' }] }
}

describe('ViWiktionarySource', () => {
  it('prefers glosses of the main part of speech, dedupes and caps at three', () => {
    const source = new ViWiktionarySource({
      a: [
        { pos: 'noun', sense: '', word: 'cái nhà' },
        { pos: 'adj', sense: '', word: 'đẹp' },
        { pos: 'adj', sense: '', word: 'đẹp' },
        { pos: 'adj', sense: '', word: 'xinh (đẹp)' },
        { pos: 'adj', sense: '', word: 'tuyệt' },
        { pos: 'adj', sense: '', word: 'rất' },
      ],
    })
    expect(source.meaningFor(word('a'))).toBe('đẹp, xinh, tuyệt')
  })

  it('falls back to any part of speech and skips long phrases and empty entries', () => {
    const source = new ViWiktionarySource({
      b: [{ pos: 'noun', sense: '', word: 'một hai ba bốn năm sáu' }, { pos: 'noun', sense: '' } as never, { pos: 'noun', sense: '', word: 'nhà' }],
    })
    expect(source.meaningFor(word('b'))).toBe('nhà')
    expect(source.meaningFor(word('missing'))).toBeNull()
  })

  it('drops Chinese-script glosses', () => {
    const source = new ViWiktionarySource({ c: [{ pos: 'pron', sense: '', word: '之' }, { pos: 'pron', sense: '', word: 'gì' }] })
    expect(source.meaningFor(word('c', 'pronoun'))).toBe('gì')
  })
})

describe('ViManager', () => {
  it('lets overrides win, uses Wiktionary next and reports gaps', () => {
    const manager = new ViManager([
      new ViOverrideSource({ a: ' tay ' }),
      new ViWiktionarySource({ a: [{ pos: 'adj', sense: '', word: 'khác' }], b: [{ pos: 'adj', sense: '', word: 'đẹp' }] }),
    ])
    const outcome = manager.apply([word('a'), word('b'), word('c')])
    expect(outcome.meanings.get('a')).toBe('tay')
    expect(outcome.meanings.get('b')).toBe('đẹp')
    expect(outcome.gaps.map(w => w.id)).toEqual(['c'])
    expect(outcome.bySource).toEqual({ [ViSourceName.Override]: 1, [ViSourceName.Wiktionary]: 1 })
  })
})

const WORDS_FILE = join(__dirname, '..', 'content', 'words.v2.json')
const NOT_VIETNAMESE = /[()　-鿿]/

describe.skipIf(!existsSync(WORDS_FILE))('generated content Vietnamese meanings', () => {
  const file = JSON.parse(readFileSync(WORDS_FILE, 'utf8')) as { contentVersion: string; words: Array<{ id: string; lemma: string; vi?: string }> }

  it('has contentVersion 3 and a meaning for every word', () => {
    expect(file.contentVersion).toBe(ViLimits.ContentVersion)
    expect(file.words.filter(word => !word.vi).map(word => word.lemma)).toEqual([])
  })

  it('keeps meanings short, free of parentheses and Chinese script', () => {
    const bad = file.words.filter(word => (word.vi ?? '').length > ViLimits.MaxMeaningChars || NOT_VIETNAMESE.test(word.vi ?? ''))
    expect(bad.map(word => `${word.lemma}: ${word.vi}`)).toEqual([])
  })

  it('stays within the gzip size budget', () => {
    expect(gzipSync(readFileSync(WORDS_FILE)).length).toBeLessThanOrEqual(PipelineLimits.MaxGzipBytes)
  })
})
