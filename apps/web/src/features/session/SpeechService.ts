import { Voice } from '@wordmap/shared'

/** Browser text-to-speech wrapper; silently does nothing when unsupported. */
export class SpeechService {
  private static readonly LANG: Record<Voice, string> = { [Voice.Us]: 'en-US', [Voice.Uk]: 'en-GB' }
  private static readonly RATE = 0.92

  speak(text: string, voice: Voice, onEnd: () => void): boolean {
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = SpeechService.LANG[voice]
      utterance.rate = SpeechService.RATE
      utterance.onend = onEnd
      utterance.onerror = onEnd
      speechSynthesis.cancel()
      speechSynthesis.speak(utterance)
      return true
    } catch {
      return false
    }
  }

  stop(): void {
    try {
      speechSynthesis.cancel()
    } catch {
      return
    }
  }
}
