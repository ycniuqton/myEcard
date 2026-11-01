import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { Ngsl31kReader } from '../data/scripts/pipeline/CandidateReader'
import { CapitalisationStats } from '../data/scripts/pipeline/CapitalisationStats'
import { DefinitionManager } from '../data/scripts/pipeline/DefinitionManager'
import { DefinitionProvider } from '../data/scripts/pipeline/DefinitionProvider'
import { ExampleManager } from '../data/scripts/pipeline/ExampleManager'
import { ExampleProvider } from '../data/scripts/pipeline/ExampleProvider'
import { ExtendedSenseSelector } from '../data/scripts/pipeline/ExtendedSenseSelector'
import { ExtensionManager } from '../data/scripts/pipeline/ExtensionManager'
import { SkipReason } from '../data/scripts/pipeline/ExtensionConfig'
import { ExtensionSourceResolver } from '../data/scripts/pipeline/ExtensionSourceResolver'
import { ManualFixesApplier } from '../data/scripts/pipeline/ManualFixes'
import { ExampleSource, SourceName } from '../data/scripts/pipeline/PipelineConfig'
import type { DefinitionResult, ExampleEntry, TokenContext, WordRecord, WordSeed } from '../data/scripts/pipeline/types'

const dir = mkdtempSync(join(tmpdir(), 'wordmap-mgr-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const CORE_COUNT = 2809
const CSV = ['lemma,wordlist,sfi,u', 'ran,,1,9', 'zebra,,1,8', 'noex,,1,7', 'nodef,,1,6', 'lantern,,1,5', 'harbor,,1,4', 'quartz,,1,3', ''].join('\n')

class FakeDefinitions extends DefinitionProvider {
  readonly name = SourceName.DictionaryApi
  async lookup(lemma: string): Promise<DefinitionResult | null> {
    return lemma === 'nodef' ? null : { ipa: 'x', senses: { noun: [`A ${lemma} thing.`] } }
  }
}

class FakeExamples extends ExampleProvider {
  readonly name = SourceName.Tatoeba
  async prepare(): Promise<void> {}
  countFor(seed: WordSeed): number {
    return seed.lemma === 'noex' ? 0 : 5
  }
  examplesFor(seed: WordSeed, limit: number): ExampleEntry[] {
    return Array.from({ length: limit }, (_, i) => ({ text: `Sentence ${i} with ${seed.lemma} inside it today.`, source: ExampleSource.Tatoeba }))
  }
  contextsFor(): TokenContext[] {
    return []
  }
}

function core(): WordRecord[] {
  return Array.from({ length: CORE_COUNT }, (_, i) => ({
    id: `ngsl:${String(i + 1).padStart(4, '0')}`, lemma: i === 0 ? 'run' : `core${i}`, rank: i + 1, band: Math.ceil((i + 1) / 100),
    pos: ['verb'], definitions: [], examples: [], listIds: ['ngsl'], forms: i === 0 ? ['ran', 'runs'] : undefined,
  }))
}

function managerOver(): ExtensionManager {
  const path = join(dir, 'candidates.csv')
  const tsv = join(dir, 'sentences.tsv')
  writeFileSync(path, CSV)
  writeFileSync(tsv, '1\teng\tWe saw a zebra today.\n')
  return new ExtensionManager(
    new ExtensionSourceResolver([new Ngsl31kReader(path)]), new CapitalisationStats(), tsv, new DefinitionManager([new FakeDefinitions()]),
    new ExampleManager([new FakeExamples()]), new ExtendedSenseSelector(), new ManualFixesApplier({}), () => undefined,
  )
}

describe('ExtensionManager', () => {
  it('skips candidates without example or definition and continues to the target', async () => {
    const result = await managerOver().extend(core(), CORE_COUNT + 3)
    expect(result.words.map(w => w.lemma)).toEqual(['zebra', 'lantern', 'harbor'])
    expect(result.words.map(w => w.id)).toEqual(['ext:2810', 'ext:2811', 'ext:2812'])
    expect(result.skips.map(s => [s.lemma, s.reason])).toEqual([['noex', SkipReason.NoExample], ['nodef', SkipReason.NoDefinition]])
  })

  it('gives extended words two examples, the extended list id and the band of their rank', async () => {
    const word = (await managerOver().extend(core(), CORE_COUNT + 1)).words[0]
    expect(word.examples).toHaveLength(2)
    expect(word.listIds).toEqual(['extended'])
    expect(word.band).toBe(29)
  })

  it('never reuses an NGSL form and reports the source licence', async () => {
    const result = await managerOver().extend(core(), CORE_COUNT + 3)
    expect(result.words.map(w => w.lemma)).not.toContain('ran')
    expect(result.source.license).toBe('CC BY-SA 4.0')
  })
})
