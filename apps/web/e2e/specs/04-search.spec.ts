import { test, expect } from '../support/fixtures'
import { Ui } from '../support/ui'

const APP_PREFIX_COUNT = 18

test.describe('search', () => {
  test('prefix search over lemma and forms, status chips, open a word', async ({ page, api }) => {
    await api.seed({ words: [{ rank: 405, status: 'learning', dueInDays: 5 }] })
    const ui = new Ui(page)
    await ui.open('/')
    await ui.tab('Search')
    await expect(ui.id('search-screen')).toBeVisible()
    await expect(ui.id('search-input')).toBeFocused()

    await ui.id('search-input').fill('app')
    const results = page.locator('[data-testid^="result-"]')
    await expect(results.first()).toBeVisible()
    expect(await results.count()).toBeGreaterThanOrEqual(APP_PREFIX_COUNT)
    await expect(ui.id('result-405')).toContainText('appear')
    await expect(ui.id('result-405')).toContainText('Learning')
    await expect(ui.id('result-495')).toContainText('Unknown')

    await ui.id('search-input').fill('was')
    await expect(ui.id('result-2')).toContainText('be')

    await ui.id('search-input').fill('appear')
    await ui.id('result-405').click()
    await expect(ui.id('word-screen')).toBeVisible()
    await expect(ui.id('word-lemma')).toHaveText('appear')
    await ui.id('back').click()
    await expect(ui.id('search-screen')).toBeVisible()
  })

  test('recent searches are remembered and clickable, clear empties the field', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/search')
    await expect(ui.id('search-recent')).toHaveCount(0)
    await ui.id('search-input').fill('water')
    await ui.id('result-322').click()
    await ui.id('back').click()
    await expect(ui.id('search-input')).toHaveValue('water')
    await ui.id('search-clear').click()
    await expect(ui.id('search-input')).toHaveValue('')
    await expect(ui.id('search-recent')).toBeVisible()
    await expect(ui.id('recent-water')).toBeVisible()
    await ui.id('recent-water').click()
    await expect(ui.id('search-input')).toHaveValue('water')
    await expect(ui.id('result-322')).toBeVisible()
  })

  test('no results shows the empty state', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/search')
    await ui.id('search-input').fill('zzzqx')
    await expect(ui.id('search-empty')).toBeVisible()
    await expect(ui.id('search-empty')).toContainText('Not in this word list yet.')
  })
})
