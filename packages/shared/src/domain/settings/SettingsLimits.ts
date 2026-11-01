/** Limits and normalisation of user-editable settings values. */
export class SettingsLimits {
  static readonly LEARNER_NAME_MAX = 40

  static learnerName(raw: string | null | undefined): string {
    return (raw ?? '').trim().slice(0, SettingsLimits.LEARNER_NAME_MAX)
  }
}
