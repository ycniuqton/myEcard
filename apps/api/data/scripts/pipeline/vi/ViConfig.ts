import type { WordRecord } from '../types'

/** File names used by the Vietnamese-meaning step. */
export class ViFiles {
  static readonly OVERRIDES = 'vi-meanings.json'
  static readonly WIKTIONARY_CACHE = 'vi-wiktionary.json'
  static readonly WORDS = 'words.v2.json'
  static readonly CREDITS = 'credits.json'
  static readonly ENCODING = 'utf8'
  static readonly TEMP_SUFFIX = '.tmp'
  static readonly MISSING_LINE_BREAK = '\n'
}

/** Tunable numbers of the Vietnamese-meaning step. */
export class ViLimits {
  static readonly ContentVersion = '3'
  static readonly MaxGlosses = 3
  static readonly MaxGlossWords = 4
  static readonly MaxMeaningChars = 60
  static readonly FetchConcurrency = 6
  static readonly FetchRetries = 3
  static readonly RetryDelayMs = 500
  static readonly SaveEvery = 500
  static readonly GlossSeparator = ', '
  static readonly MinCoverage = 0.99
}

/** Where the meanings come from, highest priority first. */
export enum ViSourceName {
  Override = 'override',
  Wiktionary = 'wiktionary',
}

export class ViEndpoints {
  static readonly KaikkiMeaning = 'https://kaikki.org/dictionary/English/meaning/'
  static readonly LanguageCode = 'vi'
  static readonly NotFound = 404
  static readonly Suffix = '.jsonl'
}

export class ViGap {
  static readonly KIND = 'vi'
}

export type ViWord = Pick<WordRecord, 'id' | 'lemma' | 'rank' | 'definitions' | 'pos'>

export type WiktionaryTranslation = { pos: string; sense: string; word: string }

export type ViCache = Record<string, WiktionaryTranslation[]>

export type ViOverrides = Record<string, string>
