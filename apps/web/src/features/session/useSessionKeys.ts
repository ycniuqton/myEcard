import { useEffect } from 'react'
import type { Grade } from '@wordmap/shared'
import type { GradeOption } from './GradePreview'

/** Keyboard keys the session screen listens to. */
export class SessionKeyMap {
  static readonly REVEAL_KEYS: readonly string[] = [' ', 'Enter']
  static readonly FIRST_DIGIT = 1
}

export interface SessionKeysInput {
  revealed: boolean
  onReveal: () => void
  onGrade: (grade: Grade) => void
  options: GradeOption[]
}

/** Keyboard shortcuts: space or enter reveals, 1-4 grades Again to Easy. */
export function useSessionKeys({ revealed, onReveal, onGrade, options }: SessionKeysInput): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return
      if (!revealed && SessionKeyMap.REVEAL_KEYS.includes(e.key)) {
        e.preventDefault()
        onReveal()
        return
      }
      const pick = options[Number(e.key) - SessionKeyMap.FIRST_DIGIT]
      if (revealed && pick) onGrade(pick.grade)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revealed, onReveal, onGrade, options])
}
