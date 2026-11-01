import type { Credit, Word, WordList } from '@wordmap/shared'

export type ContentData = { contentVersion: string; words: Word[]; credits: Credit[]; lists: WordList[] }

/** Base class of every place the word content can be loaded from. */
export abstract class ContentSource {
  abstract load(): ContentData | null
}
