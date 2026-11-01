import type { CSSProperties, ReactNode } from 'react'
import type { Word } from '@wordmap/shared'
import { Icon, IconName, StatusChip } from '../../design/primitives'
import type { LearnStatus } from '../../design/status'
import { Typo } from '../../design/typography'
import { NumberFormat } from '../common/NumberFormat'
import { IpaFormat } from '../common/IpaFormat'
import { ExampleSplitter } from './WordLogic'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, IconSize, Motion, Shadow } from '../../design/styleValues'
import { WordCopy } from './WordCopy'
import { A11yCopy } from '../../design/primitives/A11yCopy'

export type SpeakKey = string

const OUTLINE_PILL: CSSProperties = {
  height: Size.S26,
  display: 'flex',
  alignItems: 'center',
  padding: Inset.I0_10,
  borderRadius: Radius.Pill,
  border: Border.B_1px_solid_border,
  font: Typo.sans(FontWeight.Medium, FontSize.F13),
  color: 'var(--muted)',
}

type HeaderProps = { word: Word; speaking: boolean; onSay: () => void }

/** Lemma, IPA and the round pronunciation button. */
export function WordHeader({ word, speaking, onSay }: HeaderProps) {
  const lemma: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F40, Leading.L48), letterSpacing: '-.01em' }
  const audio: CSSProperties = {
    width: Size.S44,
    height: Size.S44,
    borderRadius: Radius.Pill,
    background: speaking ? 'var(--brand)' : 'var(--brandsoft)',
    color: speaking ? 'var(--onbrand)' : 'var(--brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: Motion.T_all_150ms_ease_out,
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.G4 }}>
        <span style={lemma} data-testid="word-lemma">{word.lemma}</span>
        <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F14, Leading.L20), color: 'var(--muted)' }} data-testid="word-ipa">{IpaFormat.display(word.ipa)}</span>
      </div>
      <button type="button" style={audio} aria-label={A11yCopy.PLAY_PRONUNCIATION} aria-pressed={speaking} data-testid="word-say" onClick={onSay}>
        <Icon name={IconName.Volume} size={IconSize.S20} />
      </button>
    </div>
  )
}

type ChipsProps = { word: Word; status: LearnStatus }

/** Part of speech, rank and status chips. */
export function WordChips({ word, status }: ChipsProps) {
  return (
    <div style={{ display: 'flex', gap: Gap.G6, flexWrap: 'wrap' }}>
      <span style={OUTLINE_PILL}>{word.pos.join(', ')}</span>
      <span style={{ ...OUTLINE_PILL, fontVariantNumeric: 'tabular-nums' }} data-testid="word-rank">
        #{NumberFormat.int(word.rank)}
      </span>
      <span data-testid="word-status">
        <StatusChip status={status} />
      </span>
    </div>
  )
}

type ExamplesProps = { word: Word; speakingKey: SpeakKey | null; onSay: (key: SpeakKey, text: string) => void }

/** Example sentences with the studied word highlighted and a speaker per sentence. */
export function WordExamples({ word, speakingKey, onSay }: ExamplesProps) {
  const examples = word.examples.slice(0, WordCopy.MAX_EXAMPLES)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.G12 }}>
      {examples.map((ex, i) => {
        const key = `e${i}`
        const parts = ExampleSplitter.split(ex.text, word.lemma, word.forms)
        const active = speakingKey === key
        const say: CSSProperties = {
          flex: 'none',
          width: Size.S44,
          height: Size.S44,
          margin: Inset.In9_n12_n9_0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: active ? 'var(--brand)' : 'var(--muted)',
        }
        return (
          <div key={key} style={{ display: 'flex', gap: Gap.G10, alignItems: 'flex-start' }} data-testid={`example-${i}`}>
            <span style={{ flex: 1, font: Typo.serif(FontWeight.Regular, FontSize.F17, Leading.L26), textWrap: 'pretty' }}>
              {parts.before}
              <span style={{ color: 'var(--brand)', fontWeight: FontWeight.Semibold }}>{parts.match}</span>
              {parts.after}
            </span>
            <button type="button" style={say} aria-label={A11yCopy.PLAY_EXAMPLE} aria-pressed={active} data-testid={`example-say-${i}`} onClick={() => onSay(key, ex.text)}>
              <Icon name={IconName.Volume} size={IconSize.S18} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function InfoRow({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  const row: CSSProperties = {
    height: Size.S48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: last ? undefined : '1px solid var(--border)',
  }
  return (
    <div style={row}>
      <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F15), color: 'var(--muted)' }}>{label}</span>
      {children}
    </div>
  )
}

type InfoProps = { next: string; history: readonly string[] }

/** Card with the next review label and the grade history dots. */
export function WordInfoCard({ next, history }: InfoProps) {
  const card: CSSProperties = {
    background: 'var(--surface)',
    borderRadius: Radius.R16,
    boxShadow: Shadow.S_shadow,
    border: Border.B_1px_solid_line,
    padding: Inset.I4_16,
  }
  return (
    <div style={card}>
      <InfoRow label={WordCopy.NEXT_REVIEW}>
        <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F15) }} data-testid="word-next">{next}</span>
      </InfoRow>
      <InfoRow label={WordCopy.HISTORY} last>
        <div style={{ display: 'flex', gap: Gap.G5 }} data-testid="word-history">
          {history.map((color, i) => (
            <span key={i} style={{ width: Size.S10, height: Size.S10, borderRadius: Radius.Pill, background: color }} />
          ))}
          {history.length === 0 ? <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F15) }}>{WordCopy.NO_HISTORY}</span> : null}
        </div>
      </InfoRow>
    </div>
  )
}
