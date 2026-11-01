import type { CSSProperties } from 'react'
import { Radius, Size } from '../scale'
import { Motion } from '../styleValues'

export interface ProgressBarProps {
  mastered: number
  known: number
  learning: number
  total: number
  height?: number
}

const WIDTH_TRANSITION = 'width 350ms ease-out'

/** Stacked Mastered / Known / Learning bar over an Unknown track. */
export function ProgressBar({ mastered, known, learning, total, height = 10 }: ProgressBarProps) {
  const pct = (n: number) => `${total > 0 ? (n / total) * 100 : 0}%`
  const track: CSSProperties = { display: 'flex', gap: 2, height, borderRadius: Radius.Pill, overflow: 'hidden' }
  const seg = (color: string, n: number): CSSProperties => ({
    width: pct(n),
    background: color,
    transition: WIDTH_TRANSITION,
  })
  return (
    <div style={track}>
      <div className="wm-motion" style={seg('var(--mas)', mastered)} />
      <div className="wm-motion" style={seg('var(--kno)', known)} />
      <div className="wm-motion" style={seg('var(--lrn)', learning)} />
      <div style={{ flex: 1, background: 'var(--unk)' }} />
    </div>
  )
}

export interface SessionProgressProps {
  fraction: number
}

/** Slim brand progress line used on the session top bar. */
export function SessionProgress({ fraction }: SessionProgressProps) {
  const clamped = Math.min(1, Math.max(0, fraction))
  const track: CSSProperties = { flex: 1, height: Size.S6, borderRadius: Radius.Pill, background: 'var(--unk)', overflow: 'hidden' }
  const fill: CSSProperties = {
    width: `${clamped * 100}%`,
    height: '100%',
    background: 'var(--brand)',
    borderRadius: Radius.Pill,
    transition: Motion.T_width_300ms_ease_out,
  }
  return (
    <div style={track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}>
      <div className="wm-motion" style={fill} />
    </div>
  )
}
