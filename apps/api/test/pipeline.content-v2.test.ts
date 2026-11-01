import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { PipelineLimits } from '../data/scripts/pipeline/PipelineConfig'
import type { WordRecord } from '../data/scripts/pipeline/types'

const CONTENT = join(__dirname, '..', 'content')
const RAW = join(__dirname, '..', 'data', 'raw')
const V1 = join(CONTENT, 'words.v1.json')
const V2 = join(CONTENT, 'words.v2.json')
const CORE_FIXES = join(RAW, 'manual-fixes-core-review.json')
const ENCODING = 'utf8'
const present = existsSync(V1) && existsSync(V2)

function load(path: string): WordRecord[] {
  return (JSON.parse(readFileSync(path, ENCODING)) as { words: WordRecord[] }).words
}

describe.skipIf(!present)('generated content words.v2.json', () => {
  const v1 = present ? load(V1) : []
  const v2 = present ? load(V2) : []
  const reviewed = new Set(existsSync(CORE_FIXES) ? Object.keys(JSON.parse(readFileSync(CORE_FIXES, ENCODING))) : [])

  it('keeps ranks 1..2809 identical in id, lemma, rank, band, examples, forms and ipa', () => {
    expect(v1).toHaveLength(PipelineLimits.CoreWordCount)
    v1.forEach((word, index) => {
      const next = v2[index]
      expect([next.id, next.lemma, next.rank, next.band]).toEqual([word.id, word.lemma, word.rank, word.band])
      expect(JSON.stringify([next.examples, next.forms, next.listIds, next.ipa])).toBe(JSON.stringify([word.examples, word.forms, word.listIds, word.ipa]))
    })
  })

  it('keeps definitions byte-identical except for lemmas hand-reviewed in manual-fixes-core-review.json', () => {
    const changed = v1.filter((word, index) => JSON.stringify(word.definitions) !== JSON.stringify(v2[index].definitions))
    expect(changed.filter(word => !reviewed.has(word.lemma)).map(word => word.lemma)).toEqual([])
    expect(changed.every(word => word.rank >= 130 && word.rank <= 1000)).toBe(true)
  })

  it('has 10,000 contiguous, unique words with definitions and examples', () => {
    expect(v2).toHaveLength(PipelineLimits.ExpectedWordCount)
    expect(v2.map(word => word.rank)).toEqual(v2.map((_, index) => index + 1))
    expect(new Set(v2.map(word => word.id)).size).toBe(v2.length)
    expect(new Set(v2.map(word => word.lemma)).size).toBe(v2.length)
    expect(v2.filter(word => word.definitions.length === 0 || word.examples.length === 0)).toEqual([])
  })

  it('gives extended words ext ids, the extended list and band = ceil(rank / 100)', () => {
    const extended = v2.slice(PipelineLimits.CoreWordCount)
    expect(extended.every(word => word.id === `ext:${String(word.rank).padStart(4, '0')}`)).toBe(true)
    expect(extended.every(word => word.listIds.length === 1 && word.listIds[0] === 'extended')).toBe(true)
    expect(extended.every(word => word.band === Math.ceil(word.rank / PipelineLimits.BandSize))).toBe(true)
  })

  it('never lets an extended lemma equal an NGSL lemma or one of its forms', () => {
    const taken = new Set(v2.slice(0, PipelineLimits.CoreWordCount).flatMap(word => [word.lemma, ...(word.forms ?? [])]))
    expect(v2.slice(PipelineLimits.CoreWordCount).filter(word => taken.has(word.lemma)).map(word => word.lemma)).toEqual([])
  })

  it('stays within the gzip size budget', () => {
    expect(gzipSync(readFileSync(V2)).length).toBeLessThanOrEqual(PipelineLimits.MaxGzipBytes)
  })
})
