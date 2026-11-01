import { useCallback, useEffect, useRef, useState } from 'react'
import type { Voice } from '@wordmap/shared'
import { SpeechService } from './SpeechService'

export type SpeechControls = { speakingKey: string | null; say: (text: string, key: string) => void }

/** Speaks text with the chosen accent and tracks which item is speaking. */
export function useSpeech(voice: Voice): SpeechControls {
  const service = useRef(new SpeechService())
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const say = useCallback(
    (text: string, key: string) => {
      const started = service.current.speak(text, voice, () => setSpeakingKey(null))
      setSpeakingKey(started ? key : null)
    },
    [voice],
  )
  useEffect(() => () => service.current.stop(), [])
  return { speakingKey, say }
}
