import { defineConfig } from 'vitest/config'

const TEST_TIMEOUT_MS = 30_000
const HOOK_TIMEOUT_MS = 60_000

export default defineConfig({
  test: { testTimeout: TEST_TIMEOUT_MS, hookTimeout: HOOK_TIMEOUT_MS },
})
