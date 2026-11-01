import { PipelineLimits } from './PipelineConfig'

/** Stable id and band numbering rules for map words. */
export class WordIdentity {
  static readonly ID_PREFIX = 'ngsl:'
  static readonly EXTENDED_PREFIX = 'ext:'
  static readonly ID_DIGITS = 4
  static readonly ID_PAD = '0'

  static idFor(rank: number): string {
    const prefix = rank > PipelineLimits.CoreWordCount ? WordIdentity.EXTENDED_PREFIX : WordIdentity.ID_PREFIX
    return `${prefix}${String(rank).padStart(WordIdentity.ID_DIGITS, WordIdentity.ID_PAD)}`
  }

  static bandFor(rank: number): number {
    return Math.ceil(rank / PipelineLimits.BandSize)
  }
}
