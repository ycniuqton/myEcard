import { defineConfig, devices } from '@playwright/test'

const PORT = 3105
const LARGE_PORT = 3106
const AUTH_PORT = 3107
const BASE_URL = `http://127.0.0.1:${PORT}`
const LARGE_URL = `http://127.0.0.1:${LARGE_PORT}`
const AUTH_URL = `http://127.0.0.1:${AUTH_PORT}`
const MOBILE = { width: 390, height: 844 }
const TEST_TIMEOUT_MS = 60_000
const SERVER_TIMEOUT_MS = 120_000

export default defineConfig({
  testDir: './e2e/specs',
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './e2e/.results',
  use: {
    baseURL: BASE_URL,
    viewport: MOBILE,
    serviceWorkers: 'block',
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', testDir: './e2e/specs', use: { ...devices['Desktop Chrome'], viewport: MOBILE, hasTouch: false } },
    {
      name: 'large-map',
      testDir: './e2e/specs-large',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE, hasTouch: false, baseURL: LARGE_URL },
    },
    {
      name: 'auth-fake',
      testDir: './e2e/specs-auth',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE, hasTouch: false, baseURL: AUTH_URL },
    },
  ],
  webServer: [
    {
      command: 'node e2e/serve.mjs',
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: false,
      timeout: SERVER_TIMEOUT_MS,
      env: { E2E_PORT: String(PORT) },
    },
    {
      command: 'node e2e/serve.mjs',
      url: `${LARGE_URL}/api/health`,
      reuseExistingServer: false,
      timeout: SERVER_TIMEOUT_MS,
      env: { E2E_PORT: String(LARGE_PORT), E2E_LARGE_CONTENT: '1' },
    },
    {
      command: 'node e2e/serve.mjs',
      url: `${AUTH_URL}/api/health`,
      reuseExistingServer: false,
      timeout: SERVER_TIMEOUT_MS,
      env: { E2E_PORT: String(AUTH_PORT), E2E_AUTH_MODE: 'fake' },
    },
  ],
})
