import { writeFileSync } from 'node:fs'
import { ViEndpoints, ViFiles, ViLimits, type ViCache, type ViWord, type WiktionaryTranslation } from './ViConfig'

type KaikkiTranslation = { lang_code?: string; sense?: string; word?: string }
type KaikkiEntry = { word?: string; pos?: string; translations?: KaikkiTranslation[] }

/** Downloads the Vietnamese translation tables of kaikki.org Wiktionary extracts into a resumable cache file. */
export class ViWiktionaryFetcher {
  private next = 0
  private done = 0

  constructor(private readonly cachePath: string, private readonly cache: ViCache, private readonly log: (message: string) => void) {}

  async fetchMissing(words: ViWord[]): Promise<void> {
    const todo = words.filter(word => !(word.id in this.cache))
    const workers = Array.from({ length: ViLimits.FetchConcurrency }, () => this.work(todo))
    await Promise.all(workers)
    this.save()
  }

  private async work(todo: ViWord[]): Promise<void> {
    while (this.next < todo.length) {
      const word = todo[this.next++]
      const found = await this.lookup(word)
      if (found) this.cache[word.id] = found
      if (++this.done % ViLimits.SaveEvery === 0) this.progress(todo.length)
    }
  }

  private progress(total: number): void {
    this.save()
    this.log(`vi fetch ${this.done}/${total}`)
  }

  private async lookup(word: ViWord): Promise<WiktionaryTranslation[] | null> {
    for (let attempt = 0; attempt < ViLimits.FetchRetries; attempt++) {
      const result = await this.tryOnce(word)
      if (result) return result
      await new Promise(resolve => setTimeout(resolve, ViLimits.RetryDelayMs))
    }
    return null
  }

  private async tryOnce(word: ViWord): Promise<WiktionaryTranslation[] | null> {
    try {
      const response = await fetch(this.url(word.lemma.toLowerCase()))
      if (response.status === ViEndpoints.NotFound) return []
      return response.ok ? this.parse(await response.text(), word.lemma.toLowerCase()) : null
    } catch {
      return null
    }
  }

  private url(lemma: string): string {
    return `${ViEndpoints.KaikkiMeaning}${lemma.slice(0, 1)}/${lemma.slice(0, 2)}/${encodeURIComponent(lemma)}${ViEndpoints.Suffix}`
  }

  private parse(jsonl: string, lemma: string): WiktionaryTranslation[] {
    const entries = jsonl.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as KaikkiEntry)
    return entries.filter(entry => entry.word?.toLowerCase() === lemma).flatMap(entry => this.translations(entry))
  }

  private translations(entry: KaikkiEntry): WiktionaryTranslation[] {
    return (entry.translations ?? [])
      .filter(t => t.lang_code === ViEndpoints.LanguageCode && t.word)
      .map(t => ({ pos: entry.pos ?? '', sense: t.sense ?? '', word: t.word as string }))
  }

  private save(): void {
    writeFileSync(this.cachePath, JSON.stringify(this.cache), ViFiles.ENCODING)
  }
}
