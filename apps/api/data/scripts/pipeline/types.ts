import type { ExampleSource, GapKind } from './PipelineConfig'

/** One NGSL headword with its rank and frequency statistics. */
export type NgslEntry = { lemma: string; rank: number; sfi: number; freq: number }

export type DefinitionEntry = { pos: string; text: string }

/** Cleaned candidate glosses per part of speech, before the final senses are chosen. */
export type SenseGroups = Record<string, string[]>

export type DefinitionResult = { ipa?: string; senses: SenseGroups }

/** Token neighbours of one occurrence of a word inside a sentence. */
export type TokenContext = { prev?: string; next?: string; token: string }

export type PosEvidenceScores = Record<string, number>

export type ExampleEntry = { text: string; source: ExampleSource; sourceId?: string }

/** Word shape written to words.v1.json (matches the shared Word type). */
export type WordRecord = {
  id: string
  lemma: string
  rank: number
  band: number
  pos: string[]
  ipa?: string
  definitions: DefinitionEntry[]
  examples: ExampleEntry[]
  forms?: string[]
  cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  listIds: string[]
}

export type WordSeed = { lemma: string; forms: string[]; pos: string[] }

export type Gap = { lemma: string; rank: number; gap: GapKind }

export type ManualFix = { ipa?: string; definitions?: DefinitionEntry[]; examples?: string[] }

export type ManualFixes = Record<string, ManualFix>
