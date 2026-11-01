/** Spaces requests by a minimum interval and supports a shared cool-down. */
export class RateLimiter {
  private nextSlot = 0

  constructor(private readonly intervalMs: number) {}

  async acquire(): Promise<void> {
    const now = Date.now()
    const slot = Math.max(now, this.nextSlot)
    this.nextSlot = slot + this.intervalMs
    if (slot > now) await RateLimiter.sleep(slot - now)
  }

  coolDown(ms: number): void {
    this.nextSlot = Math.max(this.nextSlot, Date.now() + ms)
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
