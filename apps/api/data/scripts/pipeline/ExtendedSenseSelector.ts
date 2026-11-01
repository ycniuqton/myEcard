import { DefinitionCleaner } from './DefinitionCleaner'
import { ExtensionLimits } from './ExtensionConfig'
import { PipelineLimits, Pos } from './PipelineConfig'
import { SenseSelector } from './SenseSelector'
import type { DefinitionEntry, PosEvidenceScores, SenseGroups } from './types'

/** Sense choice for extension words: most common part of speech first, source order kept, specialist glosses demoted. */
export class ExtendedSenseSelector extends SenseSelector {
  static readonly WORD_CHARS = /[a-z]+/g
  static readonly FIRST = 0
  static readonly SINGLE_WORD = 1

  private readonly plainWords = new Set<string>()

  constructor(cleaner: DefinitionCleaner = new DefinitionCleaner()) {
    super(cleaner)
  }

  learn(words: Iterable<string>): void {
    for (const word of words) this.plainWords.add(word)
  }

  select(senses: SenseGroups, evidence: PosEvidenceScores = {}): DefinitionEntry[] {
    const order = Object.keys(senses).filter(pos => senses[pos].length > 0)
    const ranked = order
      .map((pos, index) => ({ pos, index, score: evidence[pos] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
    const kept = ranked.filter((item, index) => index === ExtendedSenseSelector.FIRST || this.isSecondaryKept(item.pos, evidence))
    return kept.slice(0, ExtensionLimits.MaxPosPerWord).flatMap((item, index) => this.pick(item.pos, senses[item.pos], index))
  }

  penalty(text: string): number {
    const labelled = DefinitionCleaner.LEADING_LABEL.test(text) ? 1 : 0
    const tokens = text.toLowerCase().match(ExtendedSenseSelector.WORD_CHARS) ?? []
    const unknown = tokens.filter(token => !this.plainWords.has(token)).length
    const ratio = tokens.length > 0 ? unknown / tokens.length : 0
    const heavy = (ratio > ExtensionLimits.UnknownGlossRatio ? 1 : 0) + (ratio > ExtensionLimits.VeryUnknownGlossRatio ? 1 : 0)
    const bare = tokens.length <= ExtendedSenseSelector.SINGLE_WORD ? 1 : 0
    return labelled + heavy + bare
  }

  private isSecondaryKept(pos: string, evidence: PosEvidenceScores): boolean {
    const informed = Object.values(evidence).some(score => score > 0)
    return !informed || (evidence[pos] ?? 0) > 0 || pos === Pos.Adverb
  }

  private pick(pos: string, texts: string[], index: number): DefinitionEntry[] {
    const window = texts.slice(0, ExtensionLimits.SenseWindow).map((text, order) => ({ text, order, penalty: this.penalty(text) }))
    window.sort((a, b) => a.penalty - b.penalty || a.order - b.order)
    const usable = window.filter((item, rank) => rank === ExtendedSenseSelector.FIRST || item.penalty < ExtensionLimits.MaxExtraPenalty)
    const quota = index === ExtendedSenseSelector.FIRST ? PipelineLimits.DefinitionsPerPos : PipelineLimits.DefinitionsPerOtherPos
    return usable.slice(0, quota).map(item => ({ pos, text: item.text }))
  }
}
