import { SettingsLimits, Theme, Voice } from '@wordmap/shared'
import { ThemePreference } from '../../app/theme/themeResolver'

export enum NoticeTone {
  Ok = 'ok',
  Error = 'error',
}

export type Notice = { tone: NoticeTone; text: string }

/** Copy, limits and option lists for the Settings screen. */
export class SettingsCopy {
  static readonly TITLE = 'Settings'
  static readonly BACK = 'Progress'
  static readonly NAME = 'Your name'
  static readonly NAME_PLACEHOLDER = 'Optional'
  static readonly NAME_MAX = SettingsLimits.LEARNER_NAME_MAX
  static readonly DAILY = 'New words per day'
  static readonly THEME = 'Theme'
  static readonly VOICE = 'Voice'
  static readonly REMINDER = 'Reminder time'
  static readonly EXPORT = 'Export progress (JSON)'
  static readonly IMPORT = 'Import progress (JSON)'
  static readonly RETAKE = 'Retake placement test'
  static readonly RESET = 'Reset progress'
  static readonly CREDITS = 'About and credits'
  static readonly DAILY_MIN = 3
  static readonly DAILY_MAX = 20
  static readonly FILE_TYPE = 'application/json'
  static readonly FILE_ACCEPT = 'application/json,.json'
  static readonly FILE_PREFIX = 'wordmap-progress-'
  static readonly FILE_EXT = '.json'
  static readonly RESET_CONFIRM = 'Reset all progress? This cannot be undone.'
  static readonly IMPORT_CONFIRM = 'Replace all current progress with this file?'
  static readonly EXPORTED = 'Progress exported'
  static readonly IMPORTED = 'Progress imported'
  static readonly RESET_DONE = 'Progress reset'
  static readonly FAILED = 'Something went wrong. This needs a connection to the server.'
  static readonly THEMES = [
    { value: Theme.System, label: 'System' },
    { value: Theme.Light, label: 'Light' },
    { value: Theme.Dark, label: 'Dark' },
  ] as const
  static readonly VOICES = [
    { value: Voice.Us, label: 'US' },
    { value: Voice.Uk, label: 'UK' },
  ] as const

  static themePreference(theme: Theme): ThemePreference {
    return theme as unknown as ThemePreference
  }

  static themeOf(preference: ThemePreference): Theme {
    return preference as unknown as Theme
  }

  static errorText(error: unknown): string {
    return error instanceof Error && error.message ? error.message : SettingsCopy.FAILED
  }
}

/** Browser file helpers for exporting and importing progress JSON. */
export class SettingsFiles {
  static download(json: string, date: string): void {
    const blob = new Blob([json], { type: SettingsCopy.FILE_TYPE })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${SettingsCopy.FILE_PREFIX}${date}${SettingsCopy.FILE_EXT}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  static read(file: File): Promise<string> {
    return file.text()
  }
}
