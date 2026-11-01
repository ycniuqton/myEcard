import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ButtonVariant, Icon, IconName, PrimaryButton, Surface, TileGrid } from '../../design/primitives'
import { LearnStatus } from '../../design/status'
import { Typo } from '../../design/typography'
import { RoutePath } from '../../app/routes'
import { useAppStore } from '../../store'
import { OnboardingCopy, OnboardingTestId } from './OnboardingCopy'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { IconSize, Motion } from '../../design/styleValues'

const ART_TILES = 60
const ART_STEPS: ReadonlyArray<readonly [number, LearnStatus]> = [
  [14, LearnStatus.Mastered],
  [34, LearnStatus.Known],
  [44, LearnStatus.Learning],
]
const ART_HERE = 44

const PAGE: CSSProperties = {
  flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: Gap.G20, padding: Inset.I12_20_20,
  animation: Motion.A_wmIn_300ms_ease_out,
}
const ART: CSSProperties = { display: 'flex', justifyContent: 'center', paddingTop: Size.S20 }
const HEAD: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G8 }
const KICKER: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--brand)' }
const TITLE: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F34, Leading.L40), textWrap: 'balance' }
const SUB: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F17, Leading.L26), color: 'var(--muted)', textWrap: 'pretty' }
const PERK: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: Gap.G12 }
const PERK_BADGE: CSSProperties = {
  width: Size.S28, height: Size.S28, borderRadius: Radius.Pill, background: 'var(--brandsoft)', color: 'var(--brand)', flex: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const PERK_TITLE: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F15, Leading.L22) }
const PERK_TEXT: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14, Leading.L20), color: 'var(--muted)' }
const ACTIONS: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G10 }
const GHOST: CSSProperties = { border: 'none', background: 'transparent' }
const ERROR: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--again)', textAlign: 'center' }

function artStatuses(): LearnStatus[] {
  return Array.from({ length: ART_TILES }, (_, i) => ART_STEPS.find(([end]) => i < end)?.[1] ?? LearnStatus.Unknown)
}

function Perks() {
  return (
    <Surface padding="16px 18px" gap={16}>
      {OnboardingCopy.PERKS.map(([title, text]) => (
        <div key={title} style={PERK}>
          <span style={PERK_BADGE}><Icon name={IconName.Check} size={IconSize.S16} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={PERK_TITLE}>{title}</span>
            <span style={PERK_TEXT}>{text}</span>
          </div>
        </div>
      ))}
    </Surface>
  )
}

function useSkip() {
  const navigate = useNavigate()
  const submit = useAppStore(s => s.submitPlacement)
  const [failed, setFailed] = useState(false)
  const skip = async () => {
    try {
      await submit(OnboardingCopy.SKIP_SUBMISSION)
      navigate(RoutePath.Today, { replace: true })
    } catch {
      setFailed(true)
    }
  }
  return { failed, skip }
}

/** First-run welcome: pitch, a tiny sample map, and the choice to take the word check or skip it. */
export function WelcomeScreen() {
  const navigate = useNavigate()
  const done = useAppStore(s => s.settings.placementDone)
  const { failed, skip } = useSkip()
  if (done) return <Navigate to={RoutePath.Today} replace />
  return (
    <div style={PAGE} data-testid={OnboardingTestId.Welcome}>
      <div style={ART} aria-hidden="true">
        <TileGrid statuses={artStatuses()} hereIndex={ART_HERE} />
      </div>
      <div style={HEAD}>
        <span style={KICKER}>{OnboardingCopy.BRAND}</span>
        <span style={TITLE}>{OnboardingCopy.WELCOME_TITLE}</span>
        <span style={SUB}>{OnboardingCopy.WELCOME_SUB}</span>
      </div>
      <Perks />
      <div style={{ flex: 1 }} />
      {failed ? <span style={ERROR}>{OnboardingCopy.SKIP_FAILED}</span> : null}
      <div style={ACTIONS}>
        <PrimaryButton data-testid={OnboardingTestId.TakeTest} onClick={() => navigate(RoutePath.Placement, { replace: true })}>
          {OnboardingCopy.TAKE_TEST}
        </PrimaryButton>
        <PrimaryButton variant={ButtonVariant.Outline} style={GHOST} data-testid={OnboardingTestId.Skip} onClick={() => void skip()}>
          {OnboardingCopy.SKIP}
        </PrimaryButton>
      </div>
    </div>
  )
}


