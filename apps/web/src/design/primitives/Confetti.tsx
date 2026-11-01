import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { ConfettiLayout } from '../confetti'
import { Alpha } from '../scale'

export interface ConfettiProps {
  reducedMotion?: boolean
}

/** Decorative confetti burst; renders nothing when motion is reduced. */
export function Confetti({ reducedMotion = false }: ConfettiProps) {
  const pieces = useMemo(() => (reducedMotion ? [] : ConfettiLayout.pieces()), [reducedMotion])
  return (
    <>
      {pieces.map((p, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          top: p.y,
          left: p.x,
          width: p.size,
          height: p.size,
          borderRadius: 2,
          background: p.color,
          transform: `rotate(${p.rotate})`,
          animation: `wmUp 600ms ${p.delay} ease-out both`,
          opacity: Alpha.A0_85,
          pointerEvents: 'none',
        }
        return <span key={i} className="wm-anim" style={style} aria-hidden="true" />
      })}
    </>
  )
}
