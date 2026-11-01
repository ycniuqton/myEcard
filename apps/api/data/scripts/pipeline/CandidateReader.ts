import { existsSync, readFileSync } from 'node:fs'
import { CsvReader } from './CsvReader'
import { Encoding } from './PipelineConfig'

export type RawCandidate = { lemma: string; frequency: number }

export type ExtensionSourceInfo = { id: string; name: string; url: string; license: string; attribution: string }

/** Base for any ordered frequency list that can supply extension candidates (most frequent first). */
export abstract class CandidateReader {
  abstract readonly info: ExtensionSourceInfo

  constructor(protected readonly path: string) {}

  isAvailable(): boolean {
    return existsSync(this.path)
  }

  abstract read(): RawCandidate[]

  protected dedupe(candidates: RawCandidate[]): RawCandidate[] {
    const seen = new Set<string>()
    return candidates.filter(candidate => !seen.has(candidate.lemma) && !!seen.add(candidate.lemma))
  }
}

/** NGSL 1.2 stats and frequencies to 31k, flattened to lemma,wordlist,sfi,u rows. */
export class Ngsl31kReader extends CandidateReader {
  static readonly LEMMA_COL = 0
  static readonly FREQUENCY_COL = 3

  readonly info: ExtensionSourceInfo = {
    id: 'ngsl-31k',
    name: 'NGSL 1.2 stats and frequencies to 31k',
    url: 'https://www.newgeneralservicelist.com/new-general-service-list',
    license: 'CC BY-SA 4.0',
    attribution: 'Browne, Culligan and Phillips, New General Service List 1.2 (frequencies to 31k)',
  }

  read(): RawCandidate[] {
    const rows = CsvReader.readFile(this.path).slice(1)
    const parsed = rows.map(row => ({
      lemma: row[Ngsl31kReader.LEMMA_COL].toLowerCase(),
      frequency: Number(row[Ngsl31kReader.FREQUENCY_COL]),
    }))
    return this.dedupe(parsed)
  }
}

/** Plain "word count" lines (space or tab separated), such as exported wordfreq lists. */
export class OpenFrequencyListReader extends CandidateReader {
  static readonly LINE_BREAK = /\r?\n/
  static readonly COLUMN_SPLIT = /[\s,]+/

  readonly info: ExtensionSourceInfo = {
    id: 'open-frequency-list',
    name: 'Open word frequency list',
    url: 'https://github.com/rspeer/wordfreq',
    license: 'CC BY-SA 4.0',
    attribution: 'wordfreq data (Robyn Speer and contributors)',
  }

  read(): RawCandidate[] {
    const lines = readFileSync(this.path, Encoding.Utf8).split(OpenFrequencyListReader.LINE_BREAK).filter(Boolean)
    const parsed = lines.map(line => {
      const [lemma, count] = line.split(OpenFrequencyListReader.COLUMN_SPLIT)
      return { lemma: lemma.toLowerCase(), frequency: Number(count ?? 0) }
    })
    return this.dedupe(parsed)
  }
}
