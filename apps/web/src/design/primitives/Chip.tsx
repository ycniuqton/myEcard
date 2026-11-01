import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { LearnStatus, StatusPalette } from '../status'
import { Typo } from '../typography'
import { FontSize, FontWeight, Gap, Inset, Radius, Size } from '../scale'

export interface StatusChipProps {
  status: LearnStatus
}

/** Pill showing a learning status: ring for Unknown, tinted dot otherwise. */
export function StatusChip({ status }: StatusChipProps) {
  const chip = StatusPalette.chip(status)
  const pill: CSSProperties = {
    height: Size.S26,
    display: 'inline-flex',
    alignItems: 'center',
    gap: Gap.G6,
    padding: Inset.I0_10_0_8,
    borderRadius: Radius.Pill,
    background: chip.background,
    font: Typo.sans(FontWeight.Medium, FontSize.F13),
    flex: 'none',
  }
  const dot: CSSProperties = { width: Size.S8, height: Size.S8, borderRadius: Radius.Pill, background: chip.dot, boxShadow: chip.ring }
  return (
    <span style={pill}>
      <span style={dot} />
      {chip.label}
    </span>
  )
}

export interface WordChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  status?: LearnStatus
}

/** Serif word pill; tinted with a status dot when a status is given. */
export function WordChip({ status, children, style, ...rest }: WordChipProps) {
  const chip = status ? StatusPalette.chip(status) : null
  const pill: CSSProperties = {
    height: Size.S34,
    display: 'inline-flex',
    alignItems: 'center',
    gap: Gap.G7,
    padding: chip ? '0 14px 0 11px' : '0 14px',
    borderRadius: Radius.Pill,
    border: chip ? 'none' : '1px solid var(--border)',
    color: 'inherit',
    background: chip ? chip.background : 'var(--surface)',
    font: chip ? Typo.serif(FontWeight.Regular, FontSize.F16) : Typo.serif(FontWeight.Regular, FontSize.F15),
    cursor: 'pointer',
    ...style,
  }
  const dot: CSSProperties = chip
    ? { width: Size.S8, height: Size.S8, borderRadius: Radius.Pill, background: chip.dot, boxShadow: chip.ring }
    : {}
  const hit: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: Size.S44, margin: Inset.In5_0, cursor: 'pointer' }
  return (
    <button type="button" style={hit} {...rest}>
      <span style={pill}>
        {chip ? <span style={dot} /> : null}
        {children}
      </span>
    </button>
  )
}

export interface FilterChipProps {
  label: string
  active: boolean
  onClick?: () => void
  testId?: string
}

/** Filter pill: ink fill when active, outlined otherwise. */
export function FilterChip({ label, active, onClick, testId }: FilterChipProps) {
  const pill: CSSProperties = {
    height: Size.S34,
    display: 'inline-flex',
    alignItems: 'center',
    padding: Inset.I0_14,
    borderRadius: Radius.Pill,
    background: active ? 'var(--text)' : 'var(--surface)',
    color: active ? 'var(--bg)' : 'var(--text)',
    border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
    font: Typo.sans(FontWeight.Medium, FontSize.F14),
  }
  const { height, ...visual } = pill
  const hit: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: Size.S44, margin: Inset.In5_0 }
  return (
    <button type="button" style={hit} onClick={onClick} aria-pressed={active} data-testid={testId}>
      <span style={{ ...visual, height }}>{label}</span>
    </button>
  )
}
