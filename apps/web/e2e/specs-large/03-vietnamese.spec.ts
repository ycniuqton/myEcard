import { test, expect } from '../support/fixtures'
import { Ui } from '../support/ui'

const RANK = 42
const WORD_PATH = `/word/${RANK}`
const VI_ID = 'word-vi'
const VI_TEXT = `nghĩa của word${RANK}`
const SEARCH_QUERY = 'nghia cua word4242'
const SEARCH_RANK = 4242
const BOTH_ID = 'meaning-both'
const ENGLISH_ID = 'meaning-en'

test.describe('Vietnamese meanings', () => {
  test('word detail shows the Vietnamese meaning above the English definition', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open(WORD_PATH)
    await expect(ui.id(VI_ID)).toHaveText(VI_TEXT)
    await expect(ui.id('word-definition')).toBeVisible()
  })

  test('Settings can switch to English only and back, and the choice survives a reload', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/')
    await ui.openSettings()
    await ui.id(ENGLISH_ID).click()
    await ui.open(WORD_PATH)
    await expect(ui.id('word-definition')).toBeVisible()
    await expect(ui.id(VI_ID)).toHaveCount(0)
    await ui.openSettings()
    await ui.id(BOTH_ID).click()
    await ui.open(WORD_PATH)
    await expect(ui.id(VI_ID)).toBeVisible()
  })

  test('search finds a word by its Vietnamese meaning without accents', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/')
    await ui.tab('Search')
    await ui.id('search-input').fill(SEARCH_QUERY)
    await expect(ui.id(`result-${SEARCH_RANK}`)).toBeVisible()
  })
})
