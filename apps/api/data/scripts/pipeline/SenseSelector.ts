import { DefinitionCleaner } from './DefinitionCleaner'
import { PipelineLimits, Pos } from './PipelineConfig'
import type { DefinitionEntry, PosEvidenceScores, SenseGroups } from './types'

/** Chooses which parts of speech and senses to keep, favouring core everyday meanings. */
export class SenseSelector {
  static readonly CLOSED_CLASS = new Set<string>([Pos.Preposition, Pos.Conjunction, Pos.Pronoun, Pos.Determiner, Pos.Article, Pos.Numeral])
  static readonly FIRST_POS_INDEX = 0
  static readonly CLOSED_RANK = 0
  static readonly OPEN_RANK = 1

  constructor(private readonly cleaner: DefinitionCleaner = new DefinitionCleaner()) {}

  select(senses: SenseGroups, evidence: PosEvidenceScores = {}): DefinitionEntry[] {
    const ordered = Object.entries(senses).filter(([, texts]) => texts.length > 0)
    ordered.sort((a, b) => this.rank(a[0]) - this.rank(b[0]) || (evidence[b[0]] ?? 0) - (evidence[a[0]] ?? 0))
    const kept = ordered.filter(([pos], index) => index === SenseSelector.FIRST_POS_INDEX || this.isAttested(pos, evidence))
    const picked: DefinitionEntry[] = []
    kept.slice(0, PipelineLimits.MaxPosPerWord).forEach(([pos, texts], index) => {
      const quota = index === SenseSelector.FIRST_POS_INDEX ? PipelineLimits.DefinitionsPerPos : PipelineLimits.DefinitionsPerOtherPos
      this.prefer(texts).slice(0, quota).forEach(text => picked.push({ pos, text }))
    })
    return picked
  }

  protected isAttested(pos: string, evidence: PosEvidenceScores): boolean {
    const informed = Object.values(evidence).some(score => score > 0)
    return !informed || evidence[pos] === undefined || evidence[pos] > 0
  }

  private prefer(texts: string[]): string[] {
    const scored = texts.map((text, order) => ({ text, order, penalty: this.cleaner.penalty(text) }))
    scored.sort((a, b) => a.penalty - b.penalty || a.order - b.order)
    return scored.map(item => item.text)
  }

  private rank(pos: string): number {
    return SenseSelector.CLOSED_CLASS.has(pos) ? SenseSelector.CLOSED_RANK : SenseSelector.OPEN_RANK
  }
}
