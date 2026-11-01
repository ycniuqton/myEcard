import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Credit, WordList, WordsResponse } from '@wordmap/shared'
import { ContentSource, type ContentData } from './ContentSource'

export class ContentFiles {
  static readonly WORDS_PREFERENCE: readonly string[] = ['words.v2.json', 'words.v1.json']
  static readonly CREDITS = 'credits.json'
  static readonly LISTS = 'lists.json'
  static readonly ENCODING = 'utf8'
}

/** Loads the newest words.v*.json (v2, else v1) plus credits.json and lists.json from CONTENT_DIR. */
export class FileContentSource extends ContentSource {
  constructor(private readonly dir: string) {
    super()
  }

  load(): ContentData | null {
    const wordsFile = this.wordsFile()
    if (!wordsFile) return null
    const parsed = this.readJson<WordsResponse>(wordsFile) as WordsResponse
    return {
      contentVersion: parsed.contentVersion, words: parsed.words,
      credits: this.optional<Credit>(ContentFiles.CREDITS), lists: this.optional<WordList>(ContentFiles.LISTS),
    }
  }

  private wordsFile(): string | null {
    const found = ContentFiles.WORDS_PREFERENCE.map(name => join(this.dir, name)).find(file => existsSync(file))
    return found ?? null
  }

  private optional<T>(name: string): T[] {
    const file = join(this.dir, name)
    return existsSync(file) ? (this.readJson<T[]>(file) as T[]) : []
  }

  private readJson<T>(file: string): T {
    return JSON.parse(readFileSync(file, ContentFiles.ENCODING)) as T
  }
}
