/**
 * Adds Vietnamese meanings (`vi`) to apps/api/content/words.v2.json and sets contentVersion 3.
 * Sources, highest priority first: data/raw/vi-meanings.json, then Wiktionary translations cached in data/cache.
 * Flags: --fetch downloads missing Wiktionary translation tables first. Run after build:words.
 * Run: npm run build:vi -w @wordmap/api
 */
import { PipelinePaths } from './pipeline/PipelineConfig'
import { ViLimits } from './pipeline/vi/ViConfig'
import { ViContentFile } from './pipeline/vi/ViContentFile'
import { ViManager } from './pipeline/vi/ViManager'
import { ViOverrideSource, ViWiktionarySource } from './pipeline/vi/ViSource'
import { ViWiktionaryFetcher } from './pipeline/vi/ViWiktionaryFetcher'

const FETCH_FLAG = '--fetch'
const PERCENT = 100

async function main(): Promise<void> {
  const files = new ViContentFile(new PipelinePaths())
  const content = files.readWords()
  const cache = files.readCache()
  if (process.argv.includes(FETCH_FLAG)) await new ViWiktionaryFetcher(files.cachePath, cache, console.log).fetchMissing(content.words)
  const manager = new ViManager([new ViOverrideSource(files.readOverrides()), new ViWiktionarySource(cache)])
  const outcome = manager.apply(content.words)
  files.writeWords(content, outcome.meanings)
  files.writeCredits()
  files.writeMissing(outcome.gaps)
  const coverage = outcome.meanings.size / content.words.length
  console.log(JSON.stringify({ words: content.words.length, withVi: outcome.meanings.size, gaps: outcome.gaps.length, bySource: outcome.bySource }))
  process.exitCode = coverage >= ViLimits.MinCoverage ? 0 : 1
  console.log(`coverage ${(coverage * PERCENT).toFixed(1)}%`)
}

main()
