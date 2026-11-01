import { useEffect, useState } from 'react'
import { MediaQueries } from '../common/MediaQueries'

/** True when the user asked the OS for reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.(MediaQueries.REDUCED_MOTION).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(MediaQueries.REDUCED_MOTION)
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
