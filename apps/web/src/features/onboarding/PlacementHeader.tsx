import type { CSSProperties } from 'react'
import { IconButton, IconName } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { OnboardingCopy, OnboardingTestId } from './OnboardingCopy'
import { FontSize, FontWeight, Gap, Inset, Radius, Size } from '../../design/scale'
import { Motion } from '../../design/styleValues'

const ROW: CSSProperties = { height: Size.S52, flex: 'none', display: 'flex', alignItems: 'center', gap: Gap.G12, padding: Inset.I0_20_0_10 }
const DOTS: CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Gap.G6 }
const DOT: CSSProperties = { width: Size.S8, height: Size.S8, borderRadius: Radius.Pill, transition: Motion.T_background_200ms_ease_out }
const FINISH: CSSProperties = {
  font: Typo.sans(FontWeight.Medium, FontSize.F14), color: 'var(--brand)', minHeight: Size.S44, minWidth: Size.S44, textAlign: 'right',
}
const FINISH_OFF: CSSProperties = { ...FINISH, color: 'var(--muted)', opacity: 0.5, cursor: 'default' }

export interface PlacementHeaderProps {
  done: number
  total: number
  canFinish: boolean
  onFinish: () => void
  onClose: () => void
}

function Dots({ done, total }: { done: number; total: number }) {
  return (
    <div style={DOTS} role="progressbar" aria-label={OnboardingCopy.PROGRESS_LABEL} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} data-testid={OnboardingTestId.Dots} data-done={done}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="wm-anim" style={{ ...DOT, background: i < done ? 'var(--brand)' : 'var(--unk)' }} />
      ))}
    </div>
  )
}

/** Top row of the word check: close button, probes-done dots and the Finish now link. */
export function PlacementHeader({ done, total, canFinish, onFinish, onClose }: PlacementHeaderProps) {
  return (
    <div style={ROW}>
      <IconButton icon={IconName.Close} label={OnboardingCopy.CLOSE} onClick={onClose} testId={OnboardingTestId.Close} />
      <Dots done={done} total={total} />
      <button type="button" style={canFinish ? FINISH : FINISH_OFF} disabled={!canFinish} data-testid={OnboardingTestId.FinishNow} onClick={onFinish}>
        {OnboardingCopy.FINISH_NOW}
      </button>
    </div>
  )
}
