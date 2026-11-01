import { readFileSync } from 'node:fs'
import { test, expect } from '../support/fixtures'
import { wordId } from '../support/api'
import { Ui } from '../support/ui'

const FAR = 20
const NEW_DAILY = 7
const REMINDER = '08:30'

const known = (ranks: number[]) => ranks.map(rank => ({ rank, status: 'known' as const, dueInDays: FAR }))

test.describe('settings preferences', () => {
  test('daily new words stepper changes the next session size and persists', async ({ page, api }) => {
    await api.seed({ dailyNew: 5 })
    const ui = new Ui(page)
    await ui.open('/')
    await ui.openSettings()
    await expect(ui.id('daily-value')).toHaveText('5')
    await ui.id('daily-value-inc').click()
    await ui.id('daily-value-inc').click()
    await expect(ui.id('daily-value')).toHaveText(String(NEW_DAILY))
    await api.waitFor('daily saved', s => s.settings.dailyNew === NEW_DAILY)

    await page.reload()
    await expect(ui.id('daily-value')).toHaveText(String(NEW_DAILY))
    await ui.open('/')
    await expect(ui.id('due-line')).toContainText(`${NEW_DAILY} new words`)
    await ui.id('start-session').click()
    await expect(ui.id('session-counter')).toHaveText(`1 / ${NEW_DAILY}`)
  })

  test('daily stepper respects its 3 to 20 bounds', async ({ page, api }) => {
    await api.seed({ dailyNew: 3 })
    const ui = new Ui(page)
    await ui.open('/settings')
    await expect(ui.id('daily-value')).toHaveText('3')
    await ui.id('daily-value-dec').click()
    await expect(ui.id('daily-value')).toHaveText('3')
  })

  test('theme persists across reload and is stored on the server', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/settings')
    await ui.id('theme-dark').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await api.waitFor('theme saved', s => s.settings.theme === 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(ui.id('theme-dark')).toHaveAttribute('aria-checked', 'true')
    await ui.id('theme-light').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await api.waitFor('theme light saved', s => s.settings.theme === 'light')
  })

  test('voice and reminder time are stored', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/settings')
    await ui.id('voice-uk').click()
    await expect(ui.id('voice-uk')).toHaveAttribute('aria-checked', 'true')
    await ui.id('reminder-time').fill(REMINDER)
    const state = await api.waitFor('voice and reminder saved', s => s.settings.voice === 'uk' && s.settings.reminderTime === REMINDER)
    expect(state.settings.voice).toBe('uk')
    await page.reload()
    await expect(ui.id('voice-uk')).toHaveAttribute('aria-checked', 'true')
    await expect(ui.id('reminder-time')).toHaveValue(REMINDER)
  })
})

test.describe('settings data tools', () => {
  test('export downloads a parseable snapshot of the server state', async ({ page, api }) => {
    await api.seed({ words: known([1, 2, 3]) })
    const ui = new Ui(page)
    await ui.open('/settings')
    const downloading = page.waitForEvent('download')
    await ui.id('export-json').click()
    const download = await downloading
    expect(download.suggestedFilename()).toMatch(/^wordmap-progress-\d{4}-\d{2}-\d{2}\.json$/)
    const snapshot = JSON.parse(readFileSync((await download.path()) as string, 'utf8'))
    expect(snapshot.version).toBe(1)
    expect(snapshot.userWords.map((w: { wordId: string }) => w.wordId).sort()).toEqual([1, 2, 3].map(wordId))
    expect(snapshot.settings.placementDone).toBe(true)
    await expect(ui.id('settings-notice')).toContainText('exported')
  })

  test('import restores progress from a file', async ({ page, api }) => {
    await api.seed({ words: known([1, 2, 3]) })
    const backup = await api.exportSnapshot()
    await api.seed({ words: known([50]) })
    const ui = new Ui(page)
    page.on('dialog', d => void d.accept())
    await ui.open('/settings')
    await ui.id('import-file').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    })
    await expect(ui.id('settings-notice')).toContainText('imported')
    const state = await api.state()
    expect(state.userWords.map(w => w.wordId).sort()).toEqual([1, 2, 3].map(wordId))
    await ui.open('/map')
    await expect(ui.id('map-known')).toHaveText('3 known')
  })

  test('import rejects a malformed file and keeps progress', async ({ page, api }) => {
    await api.seed({ words: known([1, 2]) })
    const ui = new Ui(page)
    page.on('dialog', d => void d.accept())
    await ui.open('/settings')
    await ui.id('import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') })
    await expect(ui.id('settings-notice')).toHaveAttribute('data-tone', 'error')
    expect((await api.state()).userWords).toHaveLength(2)
  })

  test('reset wipes progress and returns to first run', async ({ page, api }) => {
    await api.seed({ words: known([1, 2, 3]) })
    const ui = new Ui(page)
    page.on('dialog', d => void d.accept())
    await ui.open('/settings')
    await ui.id('reset-progress').click()
    await expect(ui.id('welcome')).toBeVisible()
    const state = await api.state()
    expect(state.userWords).toHaveLength(0)
    expect(state.settings.placementDone).toBe(false)
  })

  test('dismissing the reset confirmation changes nothing', async ({ page, api }) => {
    await api.seed({ words: known([1, 2, 3]) })
    const ui = new Ui(page)
    page.on('dialog', d => void d.dismiss())
    await ui.open('/settings')
    await ui.id('reset-progress').click()
    await expect(ui.id('settings-screen')).toBeVisible()
    expect((await api.state()).userWords).toHaveLength(3)
  })
})

test.describe('credits', () => {
  test('lists every data source with licence and CC BY-SA attribution', async ({ page, request, api }) => {
    await api.seed()
    const credits = (await (await request.get('/api/content/credits')).json()) as { name: string; license: string }[]
    expect(credits.length).toBeGreaterThanOrEqual(6)
    const ui = new Ui(page)
    await ui.open('/settings')
    await ui.id('open-credits').click()
    await expect(ui.id('credits-screen')).toBeVisible()
    await expect(page.locator('[data-testid^="credit-"]')).toHaveCount(credits.length)
    for (const [i, credit] of credits.entries()) {
      await expect(ui.id(`credit-${i}`)).toContainText(credit.name)
      await expect(ui.id(`credit-${i}`)).toContainText(credit.license)
    }
    await expect(ui.id('credits-list')).toContainText('CC BY-SA')
    await expect(ui.id('credits-list')).toContainText('Tatoeba')
    await expect(ui.id('credits-list')).toContainText('NGSL')
    await ui.id('credits-back').click()
    await expect(ui.id('settings-screen')).toBeVisible()
  })
})


const NAME = 'Linh'
const GREETING_WITHOUT_NAME = /^Good (morning|afternoon|evening)$/
const GREETING_WITH_NAME = /^Good (morning|afternoon|evening), Linh$/
const NAME_MAX = 40
const SESSION_NEW = 3

test.describe('learner name', () => {
  test('empty name gives a plain greeting and summary title', async ({ page, api }) => {
    await api.seed({ dailyNew: SESSION_NEW })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('today-greeting')).toHaveText(GREETING_WITHOUT_NAME)
    await ui.id('start-session').click()
    await ui.answerNewWords(Array(SESSION_NEW).fill('learn-it'))
    await expect(ui.id('summary-title')).toHaveText('Nice work.')
  })

  test('a saved name appears in the greeting and summary title, persists and is exported', async ({ page, api }) => {
    await api.seed({ dailyNew: SESSION_NEW })
    const ui = new Ui(page)
    await ui.open('/settings')
    await expect(ui.id('settings-name')).toHaveValue('')
    await ui.id('settings-name').fill(NAME)
    await ui.id('settings-name').blur()
    await api.waitFor('name saved', s => s.settings.learnerName === NAME)

    await page.reload()
    await expect(ui.id('settings-name')).toHaveValue(NAME)
    await ui.openToday()
    await expect(ui.id('today-greeting')).toHaveText(GREETING_WITH_NAME)
    await ui.id('start-session').click()
    await ui.answerNewWords(Array(SESSION_NEW).fill('learn-it'))
    await expect(ui.id('summary-title')).toHaveText('Nice work, Linh.')
    await ui.id('summary-done').click()

    await ui.open('/settings')
    const downloading = page.waitForEvent('download')
    await ui.id('export-json').click()
    const snapshot = JSON.parse(readFileSync((await (await downloading).path()) as string, 'utf8'))
    expect(snapshot.settings.learnerName).toBe(NAME)
    expect((await api.exportSnapshot()).settings.learnerName).toBe(NAME)
  })

  test('clearing the name restores the plain greeting; input is limited to 40 characters', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/settings')
    await ui.id('settings-name').fill('x'.repeat(NAME_MAX + 10))
    await ui.id('settings-name').blur()
    await api.waitFor('long name clipped', s => s.settings.learnerName === 'x'.repeat(NAME_MAX))
    await ui.id('settings-name').fill('')
    await ui.id('settings-name').blur()
    await api.waitFor('name cleared', s => !s.settings.learnerName)
    await ui.openToday()
    await expect(ui.id('today-greeting')).toHaveText(GREETING_WITHOUT_NAME)
  })

  test('a name edited offline is applied at once and queued until reconnect', async ({ page, context, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/settings')
    await expect(ui.id('settings-name')).toBeEnabled()
    await context.setOffline(true)
    await ui.id('settings-name').fill(NAME)
    await ui.id('settings-name').blur()
    await ui.id('settings-back').click()
    await ui.tab('Today')
    await expect(ui.id('today-greeting')).toHaveText(GREETING_WITH_NAME)
    expect((await api.state()).settings.learnerName ?? '').toBe('')
    await context.setOffline(false)
    await api.waitFor('offline name flushed', s => s.settings.learnerName === NAME)
  })
})
