import type { CSSProperties } from 'react'
import type { Word } from '@wordmap/shared'
import { PrimaryButton, ButtonVariant } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { SessionCopy, SessionTestId } from './SessionCopy'
import type { SpeechControls } from './useSpeech'
import { WordBody } from './WordBody'
import { FontSize, FontWeight, Gap, Inset, Radius } from '../../design/scale'
import { Border, Motion, Shadow } from '../../design/styleValues'

const NEW_EXAMPLES = 2
const ACTION_HEIGHT = 58

const PAGE: CSSProperties = {
  flex: 1, minHeight: 0, padding: Inset.I16_20_20, display: 'flex', flexDirection: 'column', gap: Gap.G16,
  animation: Motion.A_wmIn_250ms_ease_out,
}
const CARD: CSSProperties = {
  flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--surface)', borderRadius: Radius.R16, boxShadow: Shadow.S_shadow,
  border: Border.B_1px_solid_line, padding: Inset.I22_20, display: 'flex', flexDirection: 'column', gap: Gap.G14,
}
const BADGE: CSSProperties = {
  alignSelf: 'flex-start', font: Typo.sans(FontWeight.Semibold, FontSize.F11), letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'var(--brand)', background: 'var(--brandsoft)', padding: Inset.I4_8, borderRadius: Radius.Pill,
}
const ACTIONS: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Gap.G10, flex: 'none' }
const ACTION_FONT: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F16) }
const PRESS: CSSProperties = { ['--wm-press' as string]: '.97' }

export interface NewWordCardProps {
  word: Word
  speech: SpeechControls
  onKnow: () => void
  onLearn: () => void
}

/** New-word card: definition and examples with I already know it / Learn it. */
export function NewWordCard({ word, speech, onKnow, onLearn }: NewWordCardProps) {
  return (
    <div style={PAGE} className="wm-anim" data-testid={SessionTestId.NewCard}>
      <div style={CARD}>
        <span style={BADGE}>{SessionCopy.NEW_WORD}</span>
        <WordBody word={word} speech={speech} exampleCount={NEW_EXAMPLES} lemmaTestId={SessionTestId.BackWord} />
      </div>
      <div style={ACTIONS}>
        <PrimaryButton
          variant={ButtonVariant.Outline} height={ACTION_HEIGHT} style={{ ...ACTION_FONT, ...PRESS, background: 'var(--surface)', color: 'var(--text)' }}
          data-testid={SessionTestId.KnowIt} onClick={onKnow}
        >
          {SessionCopy.KNOW_IT}
        </PrimaryButton>
        <PrimaryButton style={{ ...ACTION_FONT, ...PRESS }} data-testid={SessionTestId.LearnIt} onClick={onLearn}>
          {SessionCopy.LEARN_IT}
        </PrimaryButton>
      </div>
    </div>
  )
}
