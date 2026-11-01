import Dexie from 'dexie'
import type { ExportSnapshot } from '@wordmap/shared'
import { OfflineStore } from '../api/OfflineStore'
import { AuthConfig } from './AuthConfig'
import type { KeyValueStorage } from './FakeAuthService'

export type LegacyDeps = {
  storage: KeyValueStorage
  exists?: (name: string) => Promise<boolean>
  open?: (name: string) => OfflineStore
  now?: () => Date
}

/** Storage values of the one-time legacy upload prompt. */
export class LegacyKeys {
  static readonly PREFIX = 'wordmap.legacyPrompt.'
  static readonly DONE = 'done'
  static readonly EXPORT_VERSION = 1

  static forUser(userId: string): string {
    return `${LegacyKeys.PREFIX}${userId}`
  }
}

/** Offers the pre-account `wordmap` database once per account; never uploads without an explicit accept. */
export class LegacyMigration {
  private readonly storage: KeyValueStorage
  private readonly exists: (name: string) => Promise<boolean>
  private readonly open: (name: string) => OfflineStore
  private readonly now: () => Date

  constructor(deps: LegacyDeps) {
    this.storage = deps.storage
    this.exists = deps.exists ?? (name => Dexie.exists(name))
    this.open = deps.open ?? (name => new OfflineStore(name))
    this.now = deps.now ?? (() => new Date())
  }

  isSettled(userId: string): boolean {
    return this.storage.getItem(LegacyKeys.forUser(userId)) === LegacyKeys.DONE
  }

  dismiss(userId: string): void {
    this.storage.setItem(LegacyKeys.forUser(userId), LegacyKeys.DONE)
  }

  /** True when the prompt should show: not settled, account empty, legacy db holds progress. */
  async shouldOffer(userId: string, accountHasProgress: boolean): Promise<boolean> {
    if (this.isSettled(userId) || accountHasProgress) return false
    return (await this.readLegacy()) !== null
  }

  /** Sends the legacy progress through the supplied importer (the existing import path), then settles the prompt. */
  async upload(userId: string, importer: (snapshot: ExportSnapshot) => Promise<void>): Promise<void> {
    const snapshot = await this.readLegacy()
    if (snapshot) await importer(snapshot)
    this.dismiss(userId)
  }

  private async readLegacy(): Promise<ExportSnapshot | null> {
    if (!(await this.exists(AuthConfig.LEGACY_DB))) return null
    const store = this.open(AuthConfig.LEGACY_DB)
    try {
      const progress = await store.loadProgress()
      const has = progress.userWords.length > 0 || progress.reviewLogs.length > 0 || progress.dayStats.length > 0
      return has ? await store.toExport(LegacyKeys.EXPORT_VERSION, this.now()) : null
    } finally {
      store.close()
    }
  }
}
