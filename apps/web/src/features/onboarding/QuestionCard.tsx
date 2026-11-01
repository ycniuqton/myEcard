import type { CSSProperties } from 'react'
import type { ProbeItem } from '@wordmap/shared'
import { ButtonVariant, Icon, IconName, PrimaryButton } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { useSpeech } from '../session/useSpeech'
import { useReducedMotion } from '../session/useReducedMotion'
import { useAppStore } from '../../store'
import { OnboardingCopy, OnboardingTestId } from './OnboardingCopy'
import { useSwipe } from './useSwipe'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, IconSize, Motion, Shadow } from '../../design/styleValues'

const ACTION_HEIGHT = 58
const SPEAK_KEY = 'placement-word'

const PAGE: CSSProperties = { flex: 1, minHeight: 0, padding: Inset.I16_20_20, display: 'flex', flexDirection: 'column', gap: Gap.G16 }
const CARD: CSSProperties = {
  flex: 1, minHeight: 0, position: 'relative', background: 'var(--surface)', borderRadius: Radius.R16, boxShadow: Shadow.S_shadow,
  border: Border.B_1px_solid_line, padding: Inset.I22_20, display: 'flex', flexDirection: 'column', alignItems: 'center',
  touchAction: 'pan-y', userSelect: 'none', animation: Motion.A_wmIn_250ms_ease_out,
}
const BADGE: CSSProperties = {
  alignSelf: 'flex-start', font: Typo.sans(FontWeight.Semibold, FontSize.F11), letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'var(--brand)', background: 'var(--brandsoft)', padding: Inset.I4_8, borderRadius: Radius.Pill,
}
const CENTER: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: Gap.G10 }
const LEMMA: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F44, Leading.L52), letterSpacing: '-.01em', textAlign: 'center', overflowWrap: 'anywhere' }
const SAY: CSSProperties = {
  width: Size.S44, height: Size.S44, borderRadius: Radius.Pill, background: 'var(--brandsoft)', color: 'var(--brand)', marginTop: Size.S10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const HINT: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F13), color: 'var(--muted)' }
const ACTIONS: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Gap.G10, flex: 'none' }
const ACTION_FONT: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F16), ['--wm-press' as string]: '.97' }
const STAMP: CSSProperties = {
  position: 'absolute', top: Size.S18, padding: Inset.I4_10, borderRadius: Radius.R8, font: Typo.sans(FontWeight.Semibold, FontSize.F13),
  letterSpacing: '.06em', textTransform: 'uppercase', background: 'var(--surface)', pointerEvents: 'none',
}

export interface QuestionCardProps {
  item: ProbeItem
  position: number
  count: number
  onAnswer: (known: boolean) => void
}

function Stamps({ offset }: { offset: number }) {
  const strength = Math.min(1, Math.abs(offset) / OnboardingCopy.SWIPE_THRESHOLD)
  const right = offset > 0
  const color = right ? 'var(--good)' : 'var(--again)'
  if (offset === 0) return null
  const side: CSSProperties = right ? { right: Size.S18 } : { left: Size.S18 }
  return (
    <span style={{ ...STAMP, ...side, color, border: `2px solid ${color}`, opacity: strength }}>
      {right ? OnboardingCopy.KNOW : OnboardingCopy.DONT_KNOW}
    </span>
  )
}

function Face({ item, position, count }: { item: ProbeItem; position: number; count: number }) {
  const voice = useAppStore(s => s.settings.voice)
  const speech = useSpeech(voice)
  return (
    <>
      <span style={BADGE}>{position} {OnboardingCopy.ITEM_OF} {count}</span>
      <div style={CENTER}>
        <span style={LEMMA} data-testid={OnboardingTestId.Word}>{item.text}</span>
        <button
          type="button" style={SAY} aria-label={`${OnboardingCopy.PRONOUNCE} ${item.text}`} data-testid={OnboardingTestId.Say}
          onPointerDown={e => e.stopPropagation()} onClick={() => speech.say(item.text, SPEAK_KEY)}
        >
          <Icon name={IconName.Volume} size={IconSize.S20} />
        </button>
      </div>
      <span style={HINT}>{OnboardingCopy.SWIPE_HINT}</span>
    </>
  )
}

function Actions({ onAnswer }: { onAnswer: (known: boolean) => void }) {
  return (
    <div style={ACTIONS}>
      <PrimaryButton
        variant={ButtonVariant.Outline} height={ACTION_HEIGHT} style={{ ...ACTION_FONT, background: 'var(--surface)', color: 'var(--text)' }}
        data-testid={OnboardingTestId.DontKnow} onClick={() => onAnswer(false)}
      >
        {OnboardingCopy.DONT_KNOW}
      </PrimaryButton>
      <PrimaryButton height={ACTION_HEIGHT} style={ACTION_FONT} data-testid={OnboardingTestId.Know} onClick={() => onAnswer(true)}>
        {OnboardingCopy.KNOW}
      </PrimaryButton>
    </div>
  )
}

/** One probe item: the bare word (real or made-up, never marked), swipeable, with Know / Don't know buttons. */
export function QuestionCard({ item, position, count, onAnswer }: QuestionCardProps) {
  const reduced = useReducedMotion()
  const swipe = useSwipe(onAnswer, true)
  const tilt = reduced ? 0 : swipe.offset / OnboardingCopy.TILT_DIVISOR
  const moving: CSSProperties = swipe.offset === 0 ? {} : { transform: `translateX(${swipe.offset}px) rotate(${tilt}deg)`, animation: 'none' }
  return (
    <div style={PAGE}>
      <div key={item.key} style={{ ...CARD, ...moving }} className="wm-anim" data-testid={OnboardingTestId.Card} {...swipe.handlers}>
        <Stamps offset={swipe.offset} />
        <Face item={item} position={position} count={count} />
      </div>
      <Actions onAnswer={onAnswer} />
    </div>
  )
}
