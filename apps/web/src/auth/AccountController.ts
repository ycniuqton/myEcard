import type { AuthManager } from './AuthManager'

export interface AccountStore {
  flushPending(): Promise<void>
  unbindDatabase(wipe: boolean): Promise<void>
}

/** Deliberate log out: push what can be pushed, clear this user's cache and memory, then end the session. */
export class AccountController {
  constructor(private readonly manager: AuthManager, private readonly store: () => AccountStore) {}

  async logout(): Promise<void> {
    await this.store().flushPending()
    const cleared = this.store().unbindDatabase(true)
    await this.manager.signOut()
    await cleared
  }
}
