import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ButtonVariant, PrimaryButton, Surface } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { OnboardingCopy, OnboardingTestId } from './OnboardingCopy'
import type { PlacementRun } from './PlacementRun'
import { PlacementConfig } from '@wordmap/shared'
import { FontSize, FontWeight, Gap, Inset, Layer, Leading, Size } from '../../design/scale'
import { Motion } from '../../design/styleValues'

const PAGE: CSSProperties = {
  position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column',
  padding: Inset.I12_20_20, gap: Gap.G20, zIndex: Layer.L5, animation: Motion.A_wmIn_300ms_ease_out, overflow: 'hidden',
}
const HEAD: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G6, paddingTop: Size.S56 }
const KICKER: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }
const TITLE: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F34, Leading.L40) }
const BIG: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F30, Leading.L36), color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }
const LINE: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F16, Leading.L22), color: 'var(--muted)' }
const STRONG: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F16), color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }
const LABEL: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F15) }
const NOTE: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F13, Leading.L19), color: 'var(--muted)', textWrap: 'pretty' }
const SLIDER: CSSProperties = { width: '100%', accentColor: 'var(--brand)', height: Size.S44, margin: 0 }
const ACTIONS: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G10 }
const GHOST: CSSProperties = { border: 'none', background: 'transparent' }
const ERROR: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--again)' }

export interface PlacementResultProps {
  run: PlacementRun
  saving: boolean
  failed: boolean
  onAccept: (level: number) => void
  onRetake: () => void
}

function Summary({ level, percent }: { level: number; percent: number }) {
  return (
    <div style={HEAD}>
      <span style={KICKER}>{OnboardingCopy.RESULT_KICKER}</span>
      <span style={TITLE}>
        {OnboardingCopy.RESULT_LEAD} <span data-testid={OnboardingTestId.Level}>{level}</span>
      </span>
      <span style={LINE}>
        {OnboardingCopy.MAP_LEAD} <span style={BIG} data-testid={OnboardingTestId.Percent}>{percent}%</span> {OnboardingCopy.MAP_LABEL}
      </span>
    </div>
  )
}

function Adjuster({ run, level, knownCount, onChange }: { run: PlacementRun; level: number; knownCount: number; onChange: (level: number) => void }) {
  return (
    <Surface padding="16px 18px" gap={Gap.G10}>
      <span style={LABEL}>{OnboardingCopy.SLIDER_LABEL}</span>
      <input
        type="range" style={SLIDER} min={0} max={run.wordCount} step={PlacementConfig.SLIDER_STEP} value={level}
        aria-label={OnboardingCopy.SLIDER_LABEL} data-testid={OnboardingTestId.Slider} onChange={e => onChange(Number(e.target.value))}
      />
      <span style={LINE}>
        <span style={STRONG} data-testid={OnboardingTestId.Marked}>{knownCount.toLocaleString(OnboardingCopy.LOCALE)}</span> {OnboardingCopy.MARKED_LABEL}
      </span>
      <span style={NOTE}>{OnboardingCopy.SLIDER_HINT}</span>
    </Surface>
  )
}

/** Placement outcome: estimated level and share of the map, a slider to adjust it, then accept or retake. */
export function PlacementResult({ run, saving, failed, onAccept, onRetake }: PlacementResultProps) {
  const [level, setLevel] = useState(() => run.estimate.estimatedRank)
  const preview = run.preview(level)
  return (
    <div style={PAGE} className="wm-anim" data-testid={OnboardingTestId.Result}>
      <Summary level={level} percent={preview.percent} />
      <Adjuster run={run} level={level} knownCount={preview.knownCount} onChange={setLevel} />
      <div style={{ flex: 1 }} />
      {failed ? <span style={ERROR} data-testid={OnboardingTestId.Failed}>{OnboardingCopy.SAVE_FAILED}</span> : null}
      <div style={ACTIONS}>
        <PrimaryButton data-testid={OnboardingTestId.Accept} disabled={saving} onClick={() => onAccept(level)}>
          {saving ? OnboardingCopy.SAVING : OnboardingCopy.ACCEPT}
        </PrimaryButton>
        <PrimaryButton variant={ButtonVariant.Outline} style={GHOST} data-testid={OnboardingTestId.Retake} disabled={saving} onClick={onRetake}>
          {OnboardingCopy.RETAKE}
        </PrimaryButton>
      </div>
    </div>
  )
}

