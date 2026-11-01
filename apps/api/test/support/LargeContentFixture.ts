import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SyntheticFormat, SyntheticWords, type Credit, type WordList, type WordsResponse } from '@wordmap/shared'
import { ContentFiles } from '../../src/content/FileContentSource'
import { TestPaths } from '../api/TestApp'

export class LargeFixtureFormat {
  static readonly V1_NAME = 'words.v1.json'
  static readonly V2_NAME = 'words.v2.json'
  static readonly V2_VERSION = '2'
  static readonly DIR_PREFIX = 'wm-large-'
  static readonly JSON_INDENT = 0
  static readonly SOURCE = 'synthetic'
  static readonly LICENSE = 'test'
}

export type LargeFixtureOptions = { total?: number; withV1?: boolean; version?: string }

/** Writes a synthetic content directory (words.v2.json, lists.json, credits.json) for tests; ids match the real map. */
export class LargeContentFixture {
  static create(options: LargeFixtureOptions = {}): string {
    const total = options.total ?? SyntheticFormat.DEFAULT_TOTAL
    const dir = mkdtempSync(join(tmpdir(), LargeFixtureFormat.DIR_PREFIX))
    const words = SyntheticWords.generate(total)
    const body: WordsResponse = { contentVersion: options.version ?? LargeFixtureFormat.V2_VERSION, words }
    writeFileSync(join(dir, LargeFixtureFormat.V2_NAME), JSON.stringify(body), ContentFiles.ENCODING)
    writeFileSync(join(dir, ContentFiles.LISTS), JSON.stringify(LargeContentFixture.lists(words.map(w => w.id))))
    writeFileSync(join(dir, ContentFiles.CREDITS), JSON.stringify(LargeContentFixture.credits()))
    if (options.withV1) copyFileSync(join(TestPaths.FIXTURES, LargeFixtureFormat.V1_NAME), join(dir, LargeFixtureFormat.V1_NAME))
    return dir
  }

  static lists(ids: string[]): WordList[] {
    const core = ids.filter(id => id.startsWith(SyntheticFormat.CORE_PREFIX))
    const extended = ids.filter(id => id.startsWith(SyntheticFormat.EXTENDED_PREFIX))
    const base = { source: LargeFixtureFormat.SOURCE, license: LargeFixtureFormat.LICENSE }
    return [
      { id: SyntheticFormat.CORE_LIST, name: 'Core', wordIds: core, ...base },
      { id: SyntheticFormat.EXTENDED_LIST, name: 'Extended', wordIds: extended, ...base },
    ]
  }

  static credits(): Credit[] {
    return [{ name: 'Synthetic', license: LargeFixtureFormat.LICENSE, url: 'https://example.invalid' }]
  }
}
