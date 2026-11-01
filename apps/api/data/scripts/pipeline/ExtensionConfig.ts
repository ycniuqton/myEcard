/** Why a candidate lemma was rejected by the filter. */
export enum RejectReason {
  Shape = 'shape',
  Numeral = 'numeral',
  Abbreviation = 'abbreviation',
  Offensive = 'offensive',
  ProperNoun = 'proper-noun',
  Known = 'known',
  InflectionOfKnown = 'inflection-of-known',
}

/** Why an accepted candidate did not become a map word. */
export enum SkipReason {
  NoExample = 'no-example',
  NoDefinition = 'no-definition',
}

/** Licence policy and licence names of the extension sources. */
export class LicenceNames {
  static readonly CcBySa4 = 'CC BY-SA 4.0'
  static readonly CcBy4 = 'CC BY 4.0'
  static readonly Cc0 = 'CC0 1.0'
  static readonly CcBySa3 = 'CC BY-SA 3.0'
  static readonly Unclear = 'unclear'
  static readonly REDISTRIBUTABLE = new Set<string>([LicenceNames.CcBySa4, LicenceNames.CcBy4, LicenceNames.Cc0, LicenceNames.CcBySa3])
}

/** Tunable numbers of the vocabulary extension. */
export class ExtensionLimits {
  static readonly ExamplesPerWord = 2
  static readonly BatchSize = 40
  static readonly MinLemmaLength = 3
  static readonly ProperNounMinCount = 5
  static readonly ProperNounRatio = 0.8
  static readonly VocabularyCandidates = 14000
  static readonly MaxPosPerWord = 2
  static readonly MinCoverage = 0.9
  static readonly SenseWindow = 5
  static readonly UnknownGlossRatio = 0.35
  static readonly VeryUnknownGlossRatio = 0.6
  static readonly MaxExtraPenalty = 2
  static readonly TrimmedExamples = 1
  static readonly ProgressEvery = 250
}

/** File names produced by the extension step. */
export class ExtensionFiles {
  static readonly SKIPS = 'extension-skips.csv'
  static readonly SKIPS_HEADER = 'lemma,rank,reason'
}

/** Command line switches of the build script. */
export class BuildFlags {
  static readonly DRY_RUN = '--dry-run'
  static readonly TARGET_PREFIX = '--target='
  static readonly CORE_ONLY = '--core-only'
}
