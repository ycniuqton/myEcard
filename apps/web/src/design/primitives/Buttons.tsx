import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { GradeTone } from '../status'
import { Typo } from '../typography'
import { FontSize, FontWeight, Radius, Size } from '../scale'
import { Border, Motion } from '../styleValues'

export enum ButtonVariant {
  Solid = 'solid',
  Outline = 'outline',
}

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  height?: number
}

/** Full-width brand button, 56px by default (64px for Show answer). */
export function PrimaryButton({
  variant = ButtonVariant.Solid,
  height = 56,
  style,
  children,
  ...rest
}: PrimaryButtonProps) {
  const solid = variant === ButtonVariant.Solid
  const base: CSSProperties = {
    height,
    width: '100%',
    flex: 'none',
    borderRadius: Radius.R12,
    background: solid ? 'var(--brand)' : 'transparent',
    color: solid ? 'var(--onbrand)' : 'var(--brand)',
    border: solid ? undefined : '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: Typo.sans(FontWeight.Semibold, FontSize.F17),
    ...style,
  }
  return (
    <button type="button" className={solid ? 'wm-press wm-block wm-block-solid' : 'wm-press wm-block'} style={base} {...rest}>
      {children}
    </button>
  )
}

export interface GradeButtonProps {
  tone: GradeTone
  label: string
  interval: string
  onClick?: () => void
}

/** Review grade tile: tinted by tone with a 3px top accent and interval. */
export function GradeButton({ tone, label, interval, onClick }: GradeButtonProps) {
  const color = `var(--${tone})`
  const base: CSSProperties = {
    height: Size.S64,
    borderRadius: Radius.R12,
    background: `color-mix(in srgb,${color} 16%,var(--surface))`,
    border: Border.B_1px_solid_line,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
    overflow: 'hidden',
    ['--wm-press' as string]: '.95',
    transition: Motion.T_transform_100ms_ease_out,
  }
  const accent: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, height: Size.S3, background: color }
  return (
    <button type="button" className="wm-press" style={base} onClick={onClick}>
      <span style={accent} />
      <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F16) }}>{label}</span>
      <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F12), color: 'var(--muted)' }}>{interval}</span>
    </button>
  )
}
