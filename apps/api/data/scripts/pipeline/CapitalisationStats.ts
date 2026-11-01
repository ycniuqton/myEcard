import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { Encoding } from './PipelineConfig'
import { ExtensionLimits } from './ExtensionConfig'

type CaseCount = { capital: number; lower: number }

/** Counts how often each word is capitalised in mid-sentence position, to spot proper nouns. */
export class CapitalisationStats {
  static readonly WORD = /[A-Za-z]+(?:'[A-Za-z]+)*/g
  static readonly TEXT_COL = 2
  static readonly COLUMN_SEPARATOR = '\t'
  static readonly UPPER_START = /^[A-Z][a-z]/
  static readonly FIRST_TOKEN = 0

  private readonly counts = new Map<string, CaseCount>()

  async scan(path: string): Promise<void> {
    const lines = createInterface({ input: createReadStream(path, Encoding.Utf8), crlfDelay: Infinity })
    for await (const line of lines) this.addText(line.split(CapitalisationStats.COLUMN_SEPARATOR)[CapitalisationStats.TEXT_COL] ?? '')
  }

  addText(text: string): void {
    const tokens = text.match(CapitalisationStats.WORD) ?? []
    tokens.forEach((token, index) => {
      if (index === CapitalisationStats.FIRST_TOKEN) return
      const key = token.toLowerCase()
      const entry = this.counts.get(key) ?? { capital: 0, lower: 0 }
      if (CapitalisationStats.UPPER_START.test(token)) entry.capital++
      else if (token === key) entry.lower++
      this.counts.set(key, entry)
    })
  }

  isProperNoun(lemma: string): boolean {
    const entry = this.counts.get(lemma)
    if (!entry || entry.capital < ExtensionLimits.ProperNounMinCount) return false
    return entry.capital / (entry.capital + entry.lower) >= ExtensionLimits.ProperNounRatio
  }
}
