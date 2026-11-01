import type { CSSProperties } from 'react'
import { IconButton, IconName } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { SessionCopy, SessionTestId } from './SessionCopy'
import { FontSize, FontWeight, Gap, Inset, Radius, Size } from '../../design/scale'
import { Motion } from '../../design/styleValues'

const PERCENT = 100
const HALF = 0.5

const ROW: CSSProperties = { height: Size.S52, flex: 'none', display: 'flex', alignItems: 'center', gap: Gap.G12, padding: Inset.I0_20_0_10 }
const TRACK: CSSProperties = { flex: 1, height: Size.S6, borderRadius: Radius.Pill, background: 'var(--unk)', overflow: 'hidden' }
const COUNTER: CSSProperties = {
  font: Typo.sans(FontWeight.Medium, FontSize.F14), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', minWidth: Size.S44, textAlign: 'right',
}

export interface SessionHeaderProps {
  index: number
  total: number
  halfStep: boolean
  onClose: () => void
}

/** Progress percentage: finished cards plus half a step once the current card is answered-in-view. */
export function progressPercent(index: number, total: number, halfStep: boolean): number {
  return total > 0 ? ((index + (halfStep ? HALF : 0)) / total) * PERCENT : 0
}

/** Top row of the session: close button, progress bar and counter. */
export function SessionHeader({ index, total, halfStep, onClose }: SessionHeaderProps) {
  const pct = progressPercent(index, total, halfStep)
  const fill: CSSProperties = {
    width: `${pct}%`, height: '100%', background: 'var(--brand)', borderRadius: Radius.Pill, transition: Motion.T_width_300ms_ease_out,
  }
  return (
    <div style={ROW}>
      <IconButton icon={IconName.Close} label={SessionCopy.CLOSE} onClick={onClose} testId={SessionTestId.Close} />
      <div style={TRACK} data-testid={SessionTestId.Progress} data-percent={pct}>
        <div style={fill} className="wm-anim" />
      </div>
      <span style={COUNTER} data-testid={SessionTestId.Counter}>{Math.min(index + 1, total)} / {total}</span>
    </div>
  )
}
