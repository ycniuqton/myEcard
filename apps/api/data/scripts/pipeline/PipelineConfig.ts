import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Closed set of list identifiers written into Word.listIds. */
export enum ListId {
  Ngsl = 'ngsl',
  NgslSpoken = 'ngsl-spoken',
  Extended = 'extended',
}

/** Where an example sentence came from. */
export enum ExampleSource {
  Tatoeba = 'tatoeba',
  Wiktionary = 'wiktionary',
  Custom = 'custom',
}

/** Kind of content gap reported in missing.csv. */
export enum GapKind {
  Definition = 'definition',
  Example = 'example',
}

/** Part-of-speech labels used by the pipeline. */
export enum Pos {
  Noun = 'noun',
  Verb = 'verb',
  Adjective = 'adjective',
  Adverb = 'adverb',
  Preposition = 'preposition',
  Conjunction = 'conjunction',
  Pronoun = 'pronoun',
  Determiner = 'determiner',
  Interjection = 'interjection',
  Article = 'article',
  Numeral = 'numeral',
}

/** Text encodings used when reading and writing files. */
export enum Encoding {
  Utf8 = 'utf8',
}

/** Node stream and child-process event names. */
export enum StreamEvent {
  Error = 'error',
  Finish = 'finish',
  Close = 'close',
}

/** HTTP response header names read by the pipeline. */
export enum HttpHeader {
  RetryAfter = 'retry-after',
}

/** Names under which content providers identify themselves. */
export enum SourceName {
  DictionaryApi = 'dictionaryapi.dev',
  Kaikki = 'kaikki.org',
  Tatoeba = 'tatoeba',
}

/** Process exit codes of the build script. */
export enum ExitCode {
  Success = 0,
  Failure = 1,
}

/** File and directory names of the data layout and the content output. */
export class PipelineFiles {
  static readonly RAW = 'raw'
  static readonly CACHE = 'cache'
  static readonly EXTRACTED = 'extracted'
  static readonly CONTENT = 'content'
  static readonly PARENT = '..'
  static readonly MISSING = 'missing.csv'
  static readonly MANUAL_FIXES = 'manual-fixes.json'
  static readonly NGSL_STATS = 'NGSL_12_stats.csv'
  static readonly NGSL_TEACHING = 'NGSL_12_lemmatized_for_teaching.csv'
  static readonly SPOKEN_STATS = 'NGSL-Spoken_12_stats.csv'
  static readonly NGSL_OVERRIDE = 'ngsl.csv'
  static readonly TATOEBA_ARCHIVE = 'eng_sentences.tsv.bz2'
  static readonly TATOEBA_TSV = 'eng_sentences.tsv'
  static readonly LISTS = 'lists.json'
  static readonly CREDITS = 'credits.json'
  static readonly WORDS_PREFIX = 'words.v'
  static readonly WORDS_SUFFIX = '.json'
  static readonly DICTIONARY_CACHE = 'dictionaryapi'
  static readonly KAIKKI_CACHE = 'kaikki'
  static readonly CORE_REVIEW_FIXES = 'manual-fixes-core-review.json'
  static readonly NGSL_31K = 'NGSL_31k_frequencies.csv'
  static readonly PREVIEW = 'preview-words.json'
  static readonly TEMP_SUFFIX = '.tmp'
}

/** Tunable numbers of the content pipeline. */
export class PipelineLimits {
  static readonly ContentVersion = '2'
  static readonly ExpectedWordCount = 10000
  static readonly CoreWordCount = 2809
  static readonly BandSize = 100
  static readonly ExamplesPerWord = 3
  static readonly EvidenceSamples = 300
  static readonly MinSentenceWords = 6
  static readonly MaxSentenceWords = 15
  static readonly IdealSentenceWords = 10
  static readonly MinCoverage = 0.8
  static readonly ReusePenalty = 15
  static readonly LengthPenalty = 0.5
  static readonly ExactLemmaBonus = 3
  static readonly DefinitionsPerPos = 2
  static readonly DefinitionsPerOtherPos = 1
  static readonly MaxPosPerWord = 3
  static readonly MaxDefinitionChars = 160
  static readonly MinFormLength = 2
  static readonly FetchConcurrency = 5
  static readonly FetchRetries = 6
  static readonly ServerErrorRetries = 3
  static readonly KaikkiIntervalMs = 300
  static readonly FetchTimeoutMs = 20000
  static readonly MinRequestIntervalMs = 700
  static readonly BackoffBaseMs = 1000
  static readonly BackoffMaxMs = 120000
  static readonly MaxGzipBytes = 1.95 * 1024 * 1024
  static readonly ProgressEvery = 100
  static readonly PercentScale = 100
  static readonly MillisPerSecond = 1000
  static readonly FailureSample = 20
}

/** Remote endpoints used by the pipeline. */
export class Endpoints {
  static readonly DictionaryApi = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
  static readonly KaikkiMeaning = 'https://kaikki.org/dictionary/English/meaning/'
  static readonly TatoebaEnglish = 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2'
  static readonly NgslStats = 'https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv'
  static readonly NgslTeaching = 'https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv'
  static readonly SpokenStats = 'https://www.newgeneralservicelist.com/s/NGSL-Spoken_12_stats.csv'
}

/** File layout of the data directory and the content output. */
export class PipelinePaths {
  readonly data: string
  readonly raw: string
  readonly cache: string
  readonly extracted: string
  readonly content: string
  readonly missing: string
  readonly manualFixes: string
  readonly ngslStats: string
  readonly ngslTeaching: string
  readonly spokenStats: string
  readonly ngslOverride: string
  readonly tatoebaArchive: string
  readonly tatoebaTsv: string
  readonly ngsl31k: string
  readonly coreReviewFixes: string
  readonly preview: string

  constructor(dataDir?: string) {
    this.data = dataDir ?? join(dirname(fileURLToPath(import.meta.url)), PipelineFiles.PARENT, PipelineFiles.PARENT)
    this.raw = join(this.data, PipelineFiles.RAW)
    this.cache = join(this.data, PipelineFiles.CACHE)
    this.extracted = join(this.data, PipelineFiles.EXTRACTED)
    this.content = join(this.data, PipelineFiles.PARENT, PipelineFiles.CONTENT)
    this.missing = join(this.data, PipelineFiles.MISSING)
    this.manualFixes = join(this.raw, PipelineFiles.MANUAL_FIXES)
    this.ngslStats = join(this.raw, PipelineFiles.NGSL_STATS)
    this.ngslTeaching = join(this.raw, PipelineFiles.NGSL_TEACHING)
    this.spokenStats = join(this.raw, PipelineFiles.SPOKEN_STATS)
    this.ngslOverride = join(this.raw, PipelineFiles.NGSL_OVERRIDE)
    this.tatoebaArchive = join(this.raw, PipelineFiles.TATOEBA_ARCHIVE)
    this.tatoebaTsv = join(this.extracted, PipelineFiles.TATOEBA_TSV)
    this.ngsl31k = join(this.raw, PipelineFiles.NGSL_31K)
    this.preview = join(this.cache, PipelineFiles.PREVIEW)
    this.coreReviewFixes = join(this.raw, PipelineFiles.CORE_REVIEW_FIXES)
  }
}
