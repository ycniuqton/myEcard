import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { OnboardingCopy } from './OnboardingCopy'

export interface SwipeBinding {
  offset: number
  dragging: boolean
  handlers: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void
    onPointerMove: (e: PointerEvent<HTMLElement>) => void
    onPointerUp: (e: PointerEvent<HTMLElement>) => void
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void
  }
}

/** Horizontal drag on a card; releasing past the threshold reports a decision (true = right). */
export function useSwipe(onDecide: (right: boolean) => void, enabled: boolean): SwipeBinding {
  const origin = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)

  const reset = () => {
    origin.current = null
    setOffset(0)
  }
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!enabled) return
    origin.current = e.clientX
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (origin.current !== null) setOffset(e.clientX - origin.current)
  }
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (origin.current === null) return
    const delta = e.clientX - origin.current
    reset()
    if (Math.abs(delta) >= OnboardingCopy.SWIPE_THRESHOLD) onDecide(delta > 0)
  }
  return { offset, dragging: origin.current !== null, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset } }
}
