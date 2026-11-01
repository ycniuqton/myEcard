import type { AppController } from './AppController'
import { InitialData } from './InitialData'
import type { StoreContext } from './StoreTypes'

/** Switches the store between per-user databases: one account's data is never visible under another. */
export class UserBinder {
  private chain: Promise<unknown> = Promise.resolve()
  private active: string | null = null

  constructor(private readonly ctx: StoreContext, private readonly app: AppController) {}

  /** Opens the named database and loads it; null leaves the store unbound and empty. Same name is a no-op. */
  bind(name: string | null): Promise<void> {
    return this.queue(async () => {
      if (name === this.active) return
      await this.release(false)
      if (name === null) return
      this.ctx.deps.offline.use(name)
      this.active = name
      await this.app.init()
    })
  }

  /** Drops the in-memory state and closes the database; wipe also deletes its cached data. */
  unbind(wipe: boolean): Promise<void> {
    return this.queue(() => this.release(wipe))
  }

  /** Best-effort push of the outbox (used before a deliberate log out). */
  flushPending(): Promise<void> {
    return this.queue(async () => {
      if (this.active === null) return
      await this.ctx.deps.engine.flush().catch(() => undefined)
    })
  }

  private async release(wipe: boolean): Promise<void> {
    const { engine, offline } = this.ctx.deps
    this.active = null
    this.app.dispose()
    await engine.quiesce()
    if (wipe) await offline.destroy()
    else offline.close()
    engine.reset()
    this.ctx.set(InitialData.build(this.ctx.deps))
  }

  private queue(job: () => Promise<void>): Promise<void> {
    const next = this.chain.then(job)
    this.chain = next.catch(() => undefined)
    return next
  }
}
