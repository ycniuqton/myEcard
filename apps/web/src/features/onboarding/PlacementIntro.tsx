import type { CSSProperties } from 'react'
import { ButtonVariant, Icon, IconName, PrimaryButton, Surface } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { OnboardingCopy, OnboardingTestId } from './OnboardingCopy'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { IconSize, Motion } from '../../design/styleValues'

const PAGE: CSSProperties = {
  flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: Gap.G20, padding: Inset.I12_20_20, animation: Motion.A_wmIn_250ms_ease_out,
}
const HEAD: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G8, paddingTop: Size.S36 }
const KICKER: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }
const TITLE: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F34, Leading.L40) }
const SUB: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F17, Leading.L26), color: 'var(--muted)', textWrap: 'pretty' }
const STEP: CSSProperties = { display: 'flex', alignItems: 'center', gap: Gap.G12, font: Typo.sans(FontWeight.Regular, FontSize.F16) }
const BADGE: CSSProperties = {
  width: Size.S28, height: Size.S28, borderRadius: Radius.Pill, background: 'var(--brandsoft)', color: 'var(--brand)', flex: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const NOTE: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F13, Leading.L19), color: 'var(--muted)', textWrap: 'pretty' }
const ACTIONS: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G10 }
const GHOST: CSSProperties = { border: 'none', background: 'transparent' }

export interface PlacementIntroProps {
  retake: boolean
  onBegin: () => void
  onCancel: () => void
}

/** Explains the word check before it starts; retakes also warn about replacing earlier results. */
export function PlacementIntro({ retake, onBegin, onCancel }: PlacementIntroProps) {
  return (
    <div style={PAGE} className="wm-anim" data-testid={OnboardingTestId.Intro}>
      <div style={HEAD}>
        <span style={KICKER}>{OnboardingCopy.INTRO_KICKER}</span>
        <span style={TITLE}>{OnboardingCopy.INTRO_TITLE}</span>
        <span style={SUB}>{OnboardingCopy.INTRO_SUB}</span>
      </div>
      <Surface padding="16px 18px" gap={14}>
        {OnboardingCopy.INTRO_STEPS.map(text => (
          <div key={text} style={STEP}>
            <span style={BADGE}><Icon name={IconName.Check} size={IconSize.S16} /></span>
            {text}
          </div>
        ))}
      </Surface>
      {retake ? <span style={NOTE}>{OnboardingCopy.RETAKE_NOTE}</span> : null}
      <div style={{ flex: 1 }} />
      <div style={ACTIONS}>
        <PrimaryButton data-testid={OnboardingTestId.Begin} onClick={onBegin}>{OnboardingCopy.BEGIN}</PrimaryButton>
        <PrimaryButton variant={ButtonVariant.Outline} style={GHOST} data-testid={OnboardingTestId.Cancel} onClick={onCancel}>
          {OnboardingCopy.CANCEL}
        </PrimaryButton>
      </div>
    </div>
  )
}
