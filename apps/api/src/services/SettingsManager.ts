import { ListId, SettingsLimits, Theme, Voice, type Settings } from '@wordmap/shared'
import type { ProgressRepository } from '../repositories/ProgressRepository'
import type { Clock } from './Clock'

export class SettingsDefaults {
  static readonly DAILY_NEW = 5

  static create(): Settings {
    return {
      dailyNew: SettingsDefaults.DAILY_NEW, theme: Theme.System, voice: Voice.Us,
      activeListId: ListId.Ngsl, placementDone: false,
    }
  }
}

/** Reads, patches and merges the single personal settings record. */
export class SettingsManager {
  constructor(private readonly repo: ProgressRepository, private readonly clock: Clock) {}

  get(): Settings {
    return this.repo.getSettings()?.settings ?? SettingsDefaults.create()
  }

  updatedAt(): string | null {
    return this.repo.getSettings()?.updatedAt ?? null
  }

  syncedAt(): string | null {
    return this.repo.getSettings()?.syncedAt ?? null
  }

  update(patch: Omit<Partial<Settings>, 'reminderTime'> & { reminderTime?: string | null }): Settings {
    const next = { ...this.get(), ...patch } as Settings
    if (!next.reminderTime) delete next.reminderTime
    if (!SettingsLimits.learnerName(next.learnerName)) delete next.learnerName
    this.replace(next, this.clock.iso())
    return next
  }

  replace(settings: Settings, updatedAt: string): void {
    this.repo.saveSettings(settings, updatedAt, this.clock.iso())
  }

  applyIfNewer(settings: Settings, updatedAt: string): boolean {
    const current = this.updatedAt()
    if (current !== null && current >= updatedAt) return false
    this.replace(settings, updatedAt)
    return true
  }

  markPlacementDone(done: boolean): void {
    this.update({ placementDone: done })
  }
}
