/**
 * Builds apps/api/content/{words.v2.json, lists.json, credits.json} and data/missing.csv (NGSL core plus extension).
 * Resumable: definition responses are cached in data/cache. Flags: --dry-run, --target=N, --core-only.
 * Run: npm run build:words -w @wordmap/api
 */
import { BuildManager, type BuildOptions } from './pipeline/BuildManager'
import { CapitalisationStats } from './pipeline/CapitalisationStats'
import { Ngsl31kReader, OpenFrequencyListReader } from './pipeline/CandidateReader'
import { DefinitionManager } from './pipeline/DefinitionManager'
import { DictionaryApiParser } from './pipeline/DictionaryApiParser'
import { DictionaryApiProvider } from './pipeline/DictionaryApiProvider'
import { DiskCache } from './pipeline/DiskCache'
import { ExampleManager } from './pipeline/ExampleManager'
import { Exporter } from './pipeline/Exporter'
import { ExtendedSenseSelector } from './pipeline/ExtendedSenseSelector'
import { ExtendedSentenceFilter } from './pipeline/ExtendedSentenceFilter'
import { BuildFlags, ExtensionLimits } from './pipeline/ExtensionConfig'
import { ExtensionManager } from './pipeline/ExtensionManager'
import { ExtensionSourceResolver } from './pipeline/ExtensionSourceResolver'
import { HttpFetcher } from './pipeline/HttpFetcher'
import { KaikkiParser } from './pipeline/KaikkiParser'
import { KaikkiProvider } from './pipeline/KaikkiProvider'
import { ManualFixesApplier } from './pipeline/ManualFixes'
import { NgslImporter } from './pipeline/NgslImporter'
import { ExitCode, PipelineFiles, PipelineLimits, PipelinePaths } from './pipeline/PipelineConfig'
import { RateLimiter } from './pipeline/RateLimiter'
import { SentenceFilter } from './pipeline/SentenceFilter'
import { StrictDefinitionCleaner } from './pipeline/StrictDefinitionCleaner'
import { TatoebaProvider } from './pipeline/TatoebaProvider'
import { TatoebaSource } from './pipeline/TatoebaSource'

type Providers = { fetcher: HttpFetcher; cache: DiskCache; kaikkiFetcher: HttpFetcher; kaikkiCache: DiskCache }

function providersFor(paths: PipelinePaths): Providers {
  return {
    fetcher: new HttpFetcher(new RateLimiter(PipelineLimits.MinRequestIntervalMs)),
    cache: new DiskCache(`${paths.cache}/${PipelineFiles.DICTIONARY_CACHE}`),
    kaikkiFetcher: new HttpFetcher(new RateLimiter(PipelineLimits.KaikkiIntervalMs)),
    kaikkiCache: new DiskCache(`${paths.cache}/${PipelineFiles.KAIKKI_CACHE}`),
  }
}

function definitionsWith(p: Providers, cleaner?: StrictDefinitionCleaner): DefinitionManager {
  return new DefinitionManager([
    new DictionaryApiProvider(p.fetcher, p.cache, new DictionaryApiParser(cleaner)),
    new KaikkiProvider(p.kaikkiFetcher, p.kaikkiCache, new KaikkiParser(cleaner)),
  ])
}

function tatoeba(paths: PipelinePaths, extended = false): ExampleManager {
  const filter = extended ? new ExtendedSentenceFilter() : new SentenceFilter()
  const coverage = extended ? ExtensionLimits.MinCoverage : undefined
  return new ExampleManager([new TatoebaProvider(new TatoebaSource(paths), filter, coverage, extended)])
}

function extensionFor(paths: PipelinePaths, manual: ManualFixesApplier): ExtensionManager {
  const resolver = new ExtensionSourceResolver([new Ngsl31kReader(paths.ngsl31k), new OpenFrequencyListReader(paths.ngsl31k)])
  return new ExtensionManager(
    resolver, new CapitalisationStats(), paths.tatoebaTsv, definitionsWith(providersFor(paths), new StrictDefinitionCleaner()),
    tatoeba(paths, true), new ExtendedSenseSelector(new StrictDefinitionCleaner()), manual, message => console.log(message),
  )
}

function optionsFrom(args: string[]): BuildOptions & { coreOnly: boolean } {
  const target = args.find(arg => arg.startsWith(BuildFlags.TARGET_PREFIX))
  const coreOnly = args.includes(BuildFlags.CORE_ONLY)
  const targetCount = target ? Number(target.slice(BuildFlags.TARGET_PREFIX.length)) : coreOnly ? PipelineLimits.CoreWordCount : PipelineLimits.ExpectedWordCount
  return { targetCount, dryRun: args.includes(BuildFlags.DRY_RUN) || coreOnly || targetCount !== PipelineLimits.ExpectedWordCount, coreOnly }
}

async function main(): Promise<void> {
  const paths = new PipelinePaths()
  const options = optionsFrom(process.argv.slice(2))
  const manual = ManualFixesApplier.fromFile(paths.manualFixes, paths.coreReviewFixes)
  const manager = new BuildManager(
    new NgslImporter(paths), definitionsWith(providersFor(paths)), tatoeba(paths), manual, new Exporter(paths),
    message => console.log(message), options.coreOnly ? null : extensionFor(paths, manual), options,
  )
  const summary = await manager.run()
  console.log(JSON.stringify({ ...summary, failures: summary.failures.slice(0, PipelineLimits.FailureSample) }, null, 2))
  process.exitCode = summary.errors.length > 0 ? ExitCode.Failure : ExitCode.Success
}

main()
