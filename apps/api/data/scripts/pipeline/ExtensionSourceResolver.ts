import { LicenceNames } from './ExtensionConfig'
import type { CandidateReader } from './CandidateReader'

/** Picks the first available candidate source whose licence allows redistribution with attribution. */
export class ExtensionSourceResolver {
  constructor(private readonly readers: CandidateReader[]) {}

  resolve(): CandidateReader {
    const usable = this.readers.find(reader => this.isUsable(reader))
    if (!usable) throw new Error(`No usable extension source: ${this.readers.map(reader => this.describe(reader)).join('; ')}`)
    return usable
  }

  isUsable(reader: CandidateReader): boolean {
    return LicenceNames.REDISTRIBUTABLE.has(reader.info.license) && reader.isAvailable()
  }

  private describe(reader: CandidateReader): string {
    return `${reader.info.id} (${reader.info.license}, ${reader.isAvailable() ? 'present' : 'missing'})`
  }
}
