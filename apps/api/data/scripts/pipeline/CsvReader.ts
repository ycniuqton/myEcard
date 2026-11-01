import { Encoding } from './PipelineConfig'
import { existsSync, readFileSync } from 'node:fs'

/** Reads simple comma separated files, skipping blank and comment lines. */
export class CsvReader {
  static readonly COMMENT_PREFIX = '#'
  static readonly CELL_SEPARATOR = ','
  static readonly LINE_BREAK = /\r?\n/
  static readonly QUOTE = /^"|"$/g

  static parse(text: string): string[][] {
    return text
      .split(CsvReader.LINE_BREAK)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith(CsvReader.COMMENT_PREFIX))
      .map(line => line.split(CsvReader.CELL_SEPARATOR).map(cell => cell.replace(CsvReader.QUOTE, '').trim()))
  }

  static readFile(path: string): string[][] {
    return existsSync(path) ? CsvReader.parse(readFileSync(path, Encoding.Utf8)) : []
  }
}
