import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { CandidateReader, Ngsl31kReader, OpenFrequencyListReader, type ExtensionSourceInfo } from '../data/scripts/pipeline/CandidateReader'
import { LicenceNames } from '../data/scripts/pipeline/ExtensionConfig'
import { ExtensionSourceResolver } from '../data/scripts/pipeline/ExtensionSourceResolver'

const dir = mkdtempSync(join(tmpdir(), 'wordmap-ext-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

class FakeReader extends CandidateReader {
  readonly info: ExtensionSourceInfo
  constructor(id: string, license: string, private readonly present: boolean) {
    super('')
    this.info = { id, name: id, url: 'https://example.test', license, attribution: id }
  }
  isAvailable(): boolean {
    return this.present
  }
  read() {
    return []
  }
}

describe('ExtensionSourceResolver', () => {
  it('picks the first present source with a redistributable licence', () => {
    const resolver = new ExtensionSourceResolver([
      new FakeReader('unclear', LicenceNames.Unclear, true),
      new FakeReader('missing', LicenceNames.CcBySa4, false),
      new FakeReader('good', LicenceNames.CcBySa4, true),
      new FakeReader('later', LicenceNames.CcBy4, true),
    ])
    expect(resolver.resolve().info.id).toBe('good')
  })

  it('fails loudly when nothing is usable', () => {
    const resolver = new ExtensionSourceResolver([new FakeReader('unclear', LicenceNames.Unclear, true)])
    expect(() => resolver.resolve()).toThrow(/No usable extension source/)
  })

  it('treats a missing file as unavailable', () => {
    expect(new Ngsl31kReader(join(dir, 'absent.csv')).isAvailable()).toBe(false)
  })
})

describe('candidate readers', () => {
  it('reads the NGSL 31k csv in file order, lowercased and deduplicated', () => {
    const path = join(dir, 'ngsl31k.csv')
    writeFileSync(path, 'lemma,wordlist,sfi,u\nThe,NGSL,87.8,60909\nzebra,,40.1,12.5\nzebra,,40.1,12.5\nI,NGSL,80,100\n')
    const found = new Ngsl31kReader(path).read()
    expect(found.map(c => c.lemma)).toEqual(['the', 'zebra', 'i'])
    expect(found[1].frequency).toBe(12.5)
  })

  it('reads plain word/count lists', () => {
    const path = join(dir, 'freq.txt')
    writeFileSync(path, 'hello 500\nworld\t300\nhello 1\n')
    expect(new OpenFrequencyListReader(path).read()).toEqual([
      { lemma: 'hello', frequency: 500 },
      { lemma: 'world', frequency: 300 },
    ])
  })
})
