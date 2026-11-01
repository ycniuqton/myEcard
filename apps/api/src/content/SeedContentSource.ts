import { existsSync, readFileSync } from 'node:fs'
import { ExampleSource, ListId, PlacementEngine, type Word } from '@wordmap/shared'
import { ContentSource, type ContentData } from './ContentSource'

export class SeedFormat {
  static readonly VERSION = 'seed'
  static readonly SEPARATOR = '|'
  static readonly COMMENT = '#'
  static readonly FIELDS = 5
  static readonly ID_PREFIX = 'ngsl:'
  static readonly ID_DIGITS = 4
  static readonly ID_PAD = '0'
  static readonly ENCODING = 'utf8'
  static readonly LINE_BREAK = /\r?\n/
}

/** Fallback content built from the hand-written seed list when the generated file is missing. */
export class SeedContentSource extends ContentSource {
  constructor(private readonly file: string) {
    super()
  }

  load(): ContentData | null {
    if (!existsSync(this.file)) return null
    const lines = readFileSync(this.file, SeedFormat.ENCODING).split(SeedFormat.LINE_BREAK)
    const rows = lines.filter(l => l.trim() && !l.startsWith(SeedFormat.COMMENT))
    return { contentVersion: SeedFormat.VERSION, words: rows.map((l, i) => this.word(l, i + 1)), credits: [], lists: [] }
  }

  private word(line: string, rank: number): Word {
    const [lemma, pos, ipa, definition, example] = line.split(SeedFormat.SEPARATOR)
    return {
      id: `${SeedFormat.ID_PREFIX}${String(rank).padStart(SeedFormat.ID_DIGITS, SeedFormat.ID_PAD)}`,
      lemma, rank, band: new PlacementEngine().bandOf(rank), pos: [pos], ipa,
      definitions: [{ pos, text: definition }],
      examples: [{ text: example, source: ExampleSource.Custom }],
      listIds: [ListId.Ngsl],
    }
  }
}
