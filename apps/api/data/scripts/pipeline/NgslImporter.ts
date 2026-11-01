import { CsvReader } from './CsvReader'
import { PipelinePaths } from './PipelineConfig'
import type { NgslEntry } from './types'

/** Loads NGSL 1.2 ranks, the NGSL-Spoken tag set and inflected forms from raw CSVs. */
export class NgslImporter {
  static readonly LEMMA_COL = 0
  static readonly RANK_COL = 1
  static readonly SFI_COL = 2
  static readonly FREQ_COL = 3

  constructor(private readonly paths: PipelinePaths) {}

  loadEntries(): NgslEntry[] {
    const rows = CsvReader.readFile(this.paths.ngslOverride)
    const source = rows.length > 0 ? rows : CsvReader.readFile(this.paths.ngslStats)
    if (source.length === 0) throw new Error(`No NGSL list found: put ngsl.csv in ${this.paths.raw}`)
    return this.toEntries(source)
  }

  loadSpoken(): Set<string> {
    const rows = CsvReader.readFile(this.paths.spokenStats)
    return new Set(this.dataRows(rows).map(row => row[NgslImporter.LEMMA_COL].toLowerCase()))
  }

  loadForms(): Map<string, string[]> {
    const forms = new Map<string, string[]>()
    for (const row of CsvReader.readFile(this.paths.ngslTeaching)) {
      const head = row[NgslImporter.LEMMA_COL].toLowerCase()
      const merged = new Set([...(forms.get(head) ?? []), ...row.map(cell => cell.toLowerCase())])
      forms.set(head, [...merged].filter(Boolean))
    }
    return forms
  }

  private toEntries(rows: string[][]): NgslEntry[] {
    return this.dataRows(rows)
      .map(row => ({
        lemma: row[NgslImporter.LEMMA_COL].toLowerCase(),
        rank: Number(row[NgslImporter.RANK_COL]),
        sfi: Number(row[NgslImporter.SFI_COL] ?? 0),
        freq: Number(row[NgslImporter.FREQ_COL] ?? 0),
      }))
      .sort((a, b) => a.rank - b.rank)
  }

  private dataRows(rows: string[][]): string[][] {
    const hasHeader = rows.length > 0 && Number.isNaN(Number(rows[0][NgslImporter.RANK_COL]))
    return hasHeader ? rows.slice(1) : rows
  }
}
