import type { CSSProperties, HTMLAttributes } from 'react'
import { Radius } from '../scale'
import { Border, Shadow } from '../styleValues'

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  padding?: string
  gap?: number
  animation?: string
}

/** Card surface: 16px radius, theme shadow, hairline border in dark. */
export function Surface({ padding = '16px', gap = 0, animation, style, children, ...rest }: SurfaceProps) {
  const base: CSSProperties = {
    background: 'var(--surface)',
    borderRadius: Radius.R16,
    boxShadow: Shadow.S_shadow,
    border: Border.B_1px_solid_line,
    padding,
    display: 'flex',
    flexDirection: 'column',
    gap,
    animation,
    ...style,
  }
  const className = [animation ? 'wm-anim' : '', rest.className].filter(Boolean).join(' ') || undefined
  return (
    <div style={base} {...rest} className={className}>
      {children}
    </div>
  )
}
