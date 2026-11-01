import type { CSSProperties } from 'react'
import { Typo } from '../typography'
import { FontSize, FontWeight, Gap, Radius, Size } from '../scale'
import { A11yCopy } from './A11yCopy'

export interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label?: string
  testId?: string
}

const MINUS = '−'
const PLUS = '+'

const BUTTON: CSSProperties = {
  width: Size.S44,
  height: Size.S44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: Radius.R10,
  font: Typo.sans(FontWeight.Medium, FontSize.F22),
  color: 'var(--brand)',
}

/** Numeric stepper with 44px hit targets, clamped to min and max. */
export function Stepper({ value, min, max, onChange, label, testId }: StepperProps) {
  const readout: CSSProperties = {
    width: Size.S28,
    textAlign: 'center',
    font: Typo.sans(FontWeight.Semibold, FontSize.F17),
    fontVariantNumeric: 'tabular-nums',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Gap.G4 }} role="group" aria-label={label}>
      <button type="button" style={BUTTON} aria-label={A11yCopy.DECREASE} data-testid={testId ? `${testId}-dec` : undefined} onClick={() => onChange(Math.max(min, value - 1))}>
        {MINUS}
      </button>
      <span style={readout} data-testid={testId}>{value}</span>
      <button type="button" style={BUTTON} aria-label={A11yCopy.INCREASE} data-testid={testId ? `${testId}-inc` : undefined} onClick={() => onChange(Math.min(max, value + 1))}>
        {PLUS}
      </button>
    </div>
  )
}
