import type { UserWord, Word } from '../dto'
import { ExampleSource, Status } from '../enums'
import { PlacementConfig } from '../domain/placement/PlacementConfig'

/** Domain constants of the synthetic word fixtures. */
export class SyntheticFormat {
  static readonly CORE_COUNT = 2809
  static readonly CORE_PREFIX = 'ngsl:'
  static readonly EXTENDED_PREFIX = 'ext:'
  static readonly ID_DIGITS = 4
  static readonly ID_PAD = '0'
  static readonly LEMMA_PREFIX = 'word'
  static readonly POS = 'noun'
  static readonly CORE_LIST = 'ngsl'
  static readonly EXTENDED_LIST = 'extended'
  static readonly TIMESTAMP = '2026-03-10T12:00:00.000Z'
  static readonly DEFAULT_TOTAL = 10000
}

/** Builds synthetic word lists of any size for tests: ids ngsl:0001.. then ext:<rank>, bands from the rank. */
export class SyntheticWords {
  static id(rank: number): string {
    if (rank > SyntheticFormat.CORE_COUNT) return `${SyntheticFormat.EXTENDED_PREFIX}${rank}`
    const digits = String(rank).padStart(SyntheticFormat.ID_DIGITS, SyntheticFormat.ID_PAD)
    return `${SyntheticFormat.CORE_PREFIX}${digits}`
  }

  static word(rank: number): Word {
    const core = rank <= SyntheticFormat.CORE_COUNT
    const lemma = `${SyntheticFormat.LEMMA_PREFIX}${rank}`
    return {
      id: SyntheticWords.id(rank), lemma, rank,
      band: Math.ceil(rank / PlacementConfig.BAND_SIZE), pos: [SyntheticFormat.POS],
      definitions: [{ pos: SyntheticFormat.POS, text: `definition of ${lemma}` }],
      examples: [{ text: `A sentence with ${lemma}.`, source: ExampleSource.Custom }],
      listIds: core ? [SyntheticFormat.CORE_LIST] : [SyntheticFormat.EXTENDED_LIST],
    }
  }

  static generate(total: number = SyntheticFormat.DEFAULT_TOTAL): Word[] {
    return Array.from({ length: total }, (_, i) => SyntheticWords.word(i + 1))
  }

  static bandCount(total: number): number {
    return Math.ceil(total / PlacementConfig.BAND_SIZE)
  }

  static userWords(words: Word[], count: number, status: Status = Status.Known): UserWord[] {
    return words.slice(0, count).map(w => ({
      wordId: w.id, status, assumed: false, ease: 2.5, interval: 6, reps: 2, lapses: 0,
      due: '2026-03-10', updatedAt: SyntheticFormat.TIMESTAMP,
    }))
  }
}
