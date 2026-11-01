import { Voice } from '@wordmap/shared'

enum SpeechLang {
  Us = 'en-US',
  Uk = 'en-GB',
}

/** Wraps browser speech synthesis; silently does nothing when unsupported. */
export class Speaker {
  private static readonly SPEECH_RATE = 0.92

  static speak(text: string, voice: Voice, onEnd: () => void): boolean {
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = voice === Voice.Uk ? SpeechLang.Uk : SpeechLang.Us
      utterance.rate = Speaker.SPEECH_RATE
      utterance.onend = onEnd
      utterance.onerror = onEnd
      speechSynthesis.cancel()
      speechSynthesis.speak(utterance)
      return true
    } catch {
      return false
    }
  }

  static stop(): void {
    try {
      speechSynthesis.cancel()
    } catch {
      return
    }
  }
}
