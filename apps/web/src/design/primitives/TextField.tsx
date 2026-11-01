import type { CSSProperties, InputHTMLAttributes } from 'react'
import { Typo } from '../typography'
import { FontSize, FontWeight, Gap, Inset, Radius, Size } from '../scale'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string | null
  testId: string
}

const WRAP: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G6 }
const LABEL: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F13), color: 'var(--muted)' }
const ERROR_TEXT: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F13), color: 'var(--again)' }

/** Labelled 52px text input in design tokens with an inline error line. */
export function TextField({ id, label, error, testId, style, ...rest }: TextFieldProps) {
  const input: CSSProperties = {
    height: Size.S52,
    boxSizing: 'border-box',
    width: '100%',
    padding: Inset.I0_14,
    borderRadius: Radius.R12,
    background: 'var(--surface)',
    color: 'var(--text)',
    border: `1px solid ${error ? 'var(--again)' : 'var(--border)'}`,
    font: Typo.sans(FontWeight.Regular, FontSize.F16),
    ...style,
  }
  const errorId = `${id}-error`
  return (
    <div style={WRAP}>
      <label htmlFor={id} style={LABEL}>{label}</label>
      <input id={id} data-testid={testId} style={input} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...rest} />
      {error ? <span id={errorId} role="alert" data-testid={`${testId}-error`} style={ERROR_TEXT}>{error}</span> : null}
    </div>
  )
}
