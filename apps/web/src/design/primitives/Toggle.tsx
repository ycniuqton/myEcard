import type { CSSProperties } from 'react'
import { Radius } from '../scale'
import { Motion, Shadow } from '../styleValues'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

const TRACK_WIDTH = 46
const TRACK_HEIGHT = 28
const KNOB = 22
const INSET = 3

/** Switch with brand track when on; the design has no toggle so it follows the segmented tint. */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  const track: CSSProperties = {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: Radius.Pill,
    background: checked ? 'var(--brand)' : 'var(--tint)',
    position: 'relative',
    transition: Motion.T_background_200ms_ease_out,
    flex: 'none',
  }
  const knob: CSSProperties = {
    position: 'absolute',
    top: INSET,
    left: checked ? TRACK_WIDTH - KNOB - INSET : INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: Radius.Pill,
    background: checked ? 'var(--onbrand)' : 'var(--surface)',
    boxShadow: Shadow.S_shadow,
    transition: Motion.T_left_200ms_ease_out,
  }
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} style={track} onClick={() => onChange(!checked)}>
      <span style={knob} />
    </button>
  )
}
