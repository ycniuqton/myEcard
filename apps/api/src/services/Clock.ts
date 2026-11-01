/** Time source; replaceable in tests. */
export class Clock {
  now(): Date {
    return new Date()
  }

  iso(): string {
    return this.now().toISOString()
  }
}
