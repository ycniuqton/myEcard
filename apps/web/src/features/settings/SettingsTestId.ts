/** data-testid values on the Settings and Credits screens. */
export class SettingsTestId {
  static readonly Screen = 'settings-screen'
  static readonly Back = 'settings-back'
  static readonly Name = 'settings-name'
  static readonly Daily = 'daily-value'
  static readonly Reminder = 'reminder-time'
  static readonly Export = 'export-json'
  static readonly Import = 'import-json'
  static readonly ImportFile = 'import-file'
  static readonly Retake = 'retake-placement'
  static readonly Reset = 'reset-progress'
  static readonly Credits = 'open-credits'
  static readonly Notice = 'settings-notice'
  static readonly CreditsScreen = 'credits-screen'
  static readonly CreditsBack = 'credits-back'
  static readonly CreditsList = 'credits-list'

  static readonly ThemePrefix = 'theme-'
  static readonly VoicePrefix = 'voice-'

  static credit(index: number): string {
    return `credit-${index}`
  }
}
