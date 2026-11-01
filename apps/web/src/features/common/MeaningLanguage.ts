import { StorageKeys } from './StorageKeys'

export enum MeaningLanguage {
  Both = 'both',
  English = 'en',
}

/** Copy for the meaning-language setting and the Vietnamese line. */
export class MeaningCopy {
  static readonly SETTING = 'Meanings'
  static readonly BOTH = 'Tiếng Việt + EN'
  static readonly ENGLISH = 'English'
  static readonly LANG_ATTR = 'vi'
  static readonly TEST_ID = 'word-vi'
  static readonly SETTING_TEST_PREFIX = 'meaning-'
  static readonly OPTIONS = [
    { value: MeaningLanguage.Both, label: MeaningCopy.BOTH },
    { value: MeaningLanguage.English, label: MeaningCopy.ENGLISH },
  ] as const
}

type Listener = () => void

/** Remembers the meaning language per browser and notifies subscribers; storage failures are ignored. */
export class MeaningLanguageStore {
  private static readonly VALID: ReadonlySet<string> = new Set(Object.values(MeaningLanguage))
  private static readonly listeners = new Set<Listener>()
  private static current: MeaningLanguage | null = null

  static get(): MeaningLanguage {
    MeaningLanguageStore.current ??= MeaningLanguageStore.read()
    return MeaningLanguageStore.current
  }

  static set(language: MeaningLanguage): void {
    MeaningLanguageStore.current = language
    MeaningLanguageStore.write(language)
    MeaningLanguageStore.listeners.forEach(listener => listener())
  }

  static subscribe(listener: Listener): () => void {
    MeaningLanguageStore.listeners.add(listener)
    return () => void MeaningLanguageStore.listeners.delete(listener)
  }

  private static read(): MeaningLanguage {
    try {
      const raw = localStorage.getItem(StorageKeys.MEANING_LANGUAGE)
      return raw && MeaningLanguageStore.VALID.has(raw) ? (raw as MeaningLanguage) : MeaningLanguage.Both
    } catch {
      return MeaningLanguage.Both
    }
  }

  private static write(language: MeaningLanguage): void {
    try {
      localStorage.setItem(StorageKeys.MEANING_LANGUAGE, language)
    } catch {
      return
    }
  }
}
