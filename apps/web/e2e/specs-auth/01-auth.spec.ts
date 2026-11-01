import { test as base, expect, type Page } from '@playwright/test'
import { FakeBackend } from '../support/FakeBackend'

const PASSWORD = 'correct horse'
const CONFIRM_KEY = 'wordmap.fakeAuth.confirm'
const WELCOME = 'welcome'
const SKIP = 'skip-placement'
const TODAY = 'today-screen'
const DB_PREFIX = 'wordmap-'

const test = base.extend<{ backend: FakeBackend }>({
  backend: [
    async ({ page }, use) => {
      const backend = new FakeBackend()
      await backend.install(page)
      await use(backend)
    },
    { auto: true },
  ],
})

const id = (page: Page, testId: string) => page.getByTestId(testId)

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto('/signup')
  await id(page, 'auth-email').fill(email)
  await id(page, 'auth-password').fill(PASSWORD)
  await id(page, 'auth-confirm').fill(PASSWORD)
  await id(page, 'auth-submit').click()
}

async function logIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await id(page, 'auth-email').fill(email)
  await id(page, 'auth-password').fill(password)
  await id(page, 'auth-submit').click()
}

async function skipPlacement(page: Page): Promise<void> {
  await expect(id(page, WELCOME)).toBeVisible()
  await id(page, SKIP).click()
  await expect(id(page, TODAY)).toBeVisible()
}

async function logOut(page: Page): Promise<void> {
  await page.goto('/settings')
  await expect(id(page, 'account-card')).toBeVisible()
  await id(page, 'account-logout').click()
  await expect(id(page, 'login-screen')).toBeVisible()
}

const userDbs = (page: Page) =>
  page.evaluate(async prefix => (await indexedDB.databases()).map(d => d.name ?? '').filter(n => n.startsWith(prefix)), DB_PREFIX)

test('signed-out visitors land on /login', async ({ page }) => {
  await page.goto('/map')
  await expect(page).toHaveURL(/\/login$/)
  await expect(id(page, 'login-screen')).toBeVisible()
})

test('sign up lands in the app, log out returns to login, log in works again', async ({ page, backend }) => {
  await signUp(page, 'ann@example.com')
  await skipPlacement(page)
  await page.goto('/settings')
  await expect(id(page, 'account-email')).toHaveText('ann@example.com')
  await logOut(page)
  await expect(page).toHaveURL(/\/login$/)
  await logIn(page, 'ann@example.com')
  await expect(id(page, TODAY)).toBeVisible()
  expect(backend.unauthenticated).toEqual([])
})

test('wrong password shows a friendly message and stays on login', async ({ page }) => {
  await signUp(page, 'bob@example.com')
  await skipPlacement(page)
  await logOut(page)
  await logIn(page, 'bob@example.com', 'not the password')
  await expect(id(page, 'auth-error')).toContainText('Wrong email or password')
  await expect(id(page, 'login-screen')).toBeVisible()
})

test('sign up validates the form before calling the provider', async ({ page }) => {
  await page.goto('/signup')
  await id(page, 'auth-email').fill('not-an-email')
  await id(page, 'auth-password').fill('short')
  await id(page, 'auth-confirm').fill('different')
  await id(page, 'auth-submit').click()
  await expect(id(page, 'auth-email-error')).toBeVisible()
  await expect(id(page, 'auth-password-error')).toContainText('at least 8')
  await expect(id(page, 'auth-confirm-error')).toContainText('do not match')
})

test('two accounts on one device never see each other', async ({ page }) => {
  await signUp(page, 'one@example.com')
  await skipPlacement(page)
  const first = await userDbs(page)
  expect(first).toHaveLength(1)
  await logOut(page)
  await expect.poll(() => userDbs(page)).toEqual([])

  await signUp(page, 'two@example.com')
  await skipPlacement(page)
  const second = await userDbs(page)
  expect(second).toHaveLength(1)
  expect(second[0]).not.toBe(first[0])
  await logOut(page)

  await logIn(page, 'one@example.com')
  await expect(id(page, TODAY)).toBeVisible()
})

test('forgot password shows the confirmation screen', async ({ page }) => {
  await page.goto('/login')
  await id(page, 'auth-to-forgot').click()
  await id(page, 'auth-email').fill('ann@example.com')
  await id(page, 'auth-submit').click()
  await expect(id(page, 'auth-reset-sent')).toBeVisible()
  await expect(id(page, 'auth-reset-sent-text')).toContainText('ann@example.com')
})

test('sign up shows check-your-email when confirmation is required', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '1'), CONFIRM_KEY)
  await signUp(page, 'carl@example.com')
  await expect(id(page, 'auth-check-email')).toBeVisible()
  await expect(id(page, 'auth-check-email-text')).toContainText('carl@example.com')
})
