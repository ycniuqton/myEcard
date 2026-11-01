import type { ExportSnapshot } from '@wordmap/shared'
import { BaseController } from './BaseController'
import { StoreConfig } from './StoreConfig'

export enum DataMessage {
  InvalidBackup = 'Invalid backup file',
}

/** Export, import and reset of progress; import and reset need the server so state never diverges. */
export class DataController extends BaseController {
  async exportData(): Promise<ExportSnapshot> {
    await this.deps.engine.whenHydrated()
    return this.deps.offline.toExport(StoreConfig.EXPORT_VERSION, this.deps.clock())
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(await this.exportData(), null, 2)
  }

  async importData(input: ExportSnapshot | string): Promise<void> {
    const snapshot = this.parse(input)
    await this.deps.api.importData(snapshot)
    await this.deps.offline.replaceProgress({ ...snapshot })
    await this.reloadProgress()
  }

  async resetProgress(): Promise<void> {
    await this.deps.api.resetProgress()
    const settings = { ...this.state.settings, placementDone: false }
    await this.deps.offline.replaceProgress({ settings, userWords: [], dayStats: [], reviewLogs: [] })
    await this.reloadProgress()
    this.ctx.set({ session: null })
  }

  private parse(input: ExportSnapshot | string): ExportSnapshot {
    const value = typeof input === 'string' ? this.parseJson(input) : input
    const ok = value && typeof value.version === 'number' && value.settings
      && Array.isArray(value.userWords) && Array.isArray(value.dayStats) && Array.isArray(value.reviewLogs)
    if (!ok) throw new Error(DataMessage.InvalidBackup)
    return value
  }

  private parseJson(text: string): ExportSnapshot {
    try {
      return JSON.parse(text) as ExportSnapshot
    } catch {
      throw new Error(DataMessage.InvalidBackup)
    }
  }
}
