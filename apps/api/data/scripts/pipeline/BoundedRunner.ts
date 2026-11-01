/** Runs async workers over items with a fixed concurrency limit. */
export class BoundedRunner {
  constructor(private readonly limit: number) {}

  async run<T>(items: T[], worker: (item: T, index: number) => Promise<void>): Promise<void> {
    let next = 0
    const lane = async (): Promise<void> => {
      while (next < items.length) {
        const index = next++
        await worker(items[index], index)
      }
    }
    await Promise.all(Array.from({ length: Math.min(this.limit, items.length) }, lane))
  }
}
