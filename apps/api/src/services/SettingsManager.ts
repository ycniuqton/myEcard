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

/** Reads, patches and merges the single settings record of one user. */
export class SettingsManager {
  constructor(private readonly repo: ProgressRepository, private readonly clock: Clock) {}

  async get(): Promise<Settings> {
    return (await this.repo.getSettings())?.settings ?? SettingsDefaults.create()
  }

  async updatedAt(): Promise<string | null> {
    return (await this.repo.getSettings())?.updatedAt ?? null
  }

  async syncedAt(): Promise<string | null> {
    return (await this.repo.getSettings())?.syncedAt ?? null
  }

  async update(patch: Omit<Partial<Settings>, 'reminderTime'> & { reminderTime?: string | null }): Promise<Settings> {
    const next = { ...(await this.get()), ...patch } as Settings
    if (!next.reminderTime) delete next.reminderTime
    if (!SettingsLimits.learnerName(next.learnerName)) delete next.learnerName
    await this.replace(next, this.clock.iso())
    return next
  }

  replace(settings: Settings, updatedAt: string): Promise<void> {
    return this.repo.saveSettings(settings, updatedAt, this.clock.iso())
  }

  async applyIfNewer(settings: Settings, updatedAt: string): Promise<boolean> {
    const current = await this.updatedAt()
    if (current !== null && current >= updatedAt) return false
    await this.replace(settings, updatedAt)
    return true
  }

  async markPlacementDone(done: boolean): Promise<void> {
    await this.update({ placementDone: done })
  }
}
