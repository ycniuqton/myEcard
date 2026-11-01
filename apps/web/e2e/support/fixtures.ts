import { test as base, expect } from '@playwright/test'
import { TestApi } from './api'

export type Fixtures = { api: TestApi; ranks: Map<string, number>; total: number }

/** Every test starts from a wiped server (placement not done) and a fresh browser context. */
export const test = base.extend<Fixtures>({
  total: async ({ api }, use) => {
    await use(await api.totalWords())
  },
  ranks: async ({ api }, use) => {
    await use(await api.wordRanks())
  },
  api: async ({ request }, use) => {
    const api = new TestApi(request)
    await api.reset()
    await use(api)
  },
})

export { expect }

export const Tab = { Today: 'Today', Map: 'Map', Search: 'Search', Progress: 'Progress' } as const

