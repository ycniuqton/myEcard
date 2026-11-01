export type EnvHandlers = { onOnline: () => void; onOffline: () => void; onVisible: () => void }

/** Abstraction over browser connectivity, visibility and timers so sync is testable. */
export interface SyncEnvironment {
  isOnline(): boolean
  listen(handlers: EnvHandlers): () => void
  schedule(fn: () => void, ms: number): () => void
}

export class BrowserSyncEnvironment implements SyncEnvironment {
  isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false
  }

  listen(handlers: EnvHandlers): () => void {
    const visible = () => {
      if (document.visibilityState === 'visible') handlers.onVisible()
    }
    window.addEventListener('online', handlers.onOnline)
    window.addEventListener('offline', handlers.onOffline)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('online', handlers.onOnline)
      window.removeEventListener('offline', handlers.onOffline)
      document.removeEventListener('visibilitychange', visible)
    }
  }

  schedule(fn: () => void, ms: number): () => void {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  }
}
