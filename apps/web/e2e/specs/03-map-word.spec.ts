import { test, expect } from '../support/fixtures'
import { wordId } from '../support/api'
import { Ui } from '../support/ui'

const BAND_SIZE = 100
const KNOWN_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const MASTERED_RANK = 16
const LEARNING_RANKS = [11, 12, 13, 14, 15]
const KNOWN_COUNT = KNOWN_RANKS.length + 1
const UNKNOWN_IN_BAND = BAND_SIZE - KNOWN_COUNT - LEARNING_RANKS.length
const FAR_FUTURE = 30

const seedWords = () => [
  ...KNOWN_RANKS.map(rank => ({ rank, status: 'known' as const, dueInDays: FAR_FUTURE })),
  { rank: MASTERED_RANK, status: 'mastered' as const, dueInDays: FAR_FUTURE },
  ...LEARNING_RANKS.map(rank => ({ rank, status: 'learning' as const, dueInDays: FAR_FUTURE })),
]

test.describe('knowledge map', () => {
  test('headline numbers and legend match the seeded state', async ({ page, api, total }) => {
    await api.seed({ words: seedWords() })
    const ui = new Ui(page)
    await ui.open('/')
    await ui.tab('Map')
    await expect(ui.id('map-screen')).toBeVisible()
    await expect(ui.id('map-known')).toHaveText(`${KNOWN_COUNT} known`)
    const percent = Math.floor((KNOWN_COUNT / total) * 100)
    await expect(ui.id('map-percent')).toContainText(`${percent}%`)
    const legend = ui.id('map-legend')
    await expect(legend).toContainText('Mastered 1')
    await expect(legend).toContainText('Known 10')
    await expect(legend).toContainText('Learning 5')
    await expect(ui.id('band-1')).toHaveAttribute('data-here', /.+/)
    await expect(ui.id('band-1')).toContainText('1–100')
  })

  test('bands and compact toggle, mode is remembered across reload', async ({ page, api }) => {
    await api.seed({ words: seedWords() })
    const ui = new Ui(page)
    await ui.open('/map')
    await expect(ui.id('map-bands')).toBeVisible()
    await ui.id('map-mode-compact').click()
    await expect(ui.id('map-compact')).toBeVisible()
    await expect(ui.id('map-bands')).toHaveCount(0)
    await page.reload()
    await expect(ui.id('map-compact')).toBeVisible()
    await ui.id('map-mode-bands').click()
    await expect(ui.id('map-bands')).toBeVisible()
  })

  test('band detail filters narrow the word rows', async ({ page, api }) => {
    await api.seed({ words: seedWords() })
    const ui = new Ui(page)
    await ui.open('/map')
    await ui.id('band-1').click()
    await expect(ui.id('band-screen')).toBeVisible()
    await expect(ui.id('band-title')).toHaveText('Words 1–100')
    await expect(ui.id('band-percent')).toHaveText(`${KNOWN_COUNT}% known`)
    const rows = ui.id('band-rows').locator('[data-testid^="row-"]')
    await expect(rows).toHaveCount(BAND_SIZE)

    await ui.id('filter-known').click()
    await expect(rows).toHaveCount(KNOWN_COUNT)
    await expect(ui.id('row-1')).toContainText('Known')
    await expect(ui.id('row-16')).toContainText('Mastered')

    await ui.id('filter-learning').click()
    await expect(rows).toHaveCount(LEARNING_RANKS.length)
    await expect(ui.id('row-12')).toContainText('Learning')

    await ui.id('filter-unknown').click()
    await expect(rows).toHaveCount(UNKNOWN_IN_BAND)
    await expect(ui.id('row-20')).toContainText('Unknown')

    await ui.id('filter-all').click()
    await expect(rows).toHaveCount(BAND_SIZE)
  })
})

test.describe('word detail actions', () => {
  test('know, reset, start learning and review now change status chips and the server', async ({ page, api }) => {
    await api.seed({ words: seedWords() })
    const ui = new Ui(page)
    await ui.open('/map')
    await ui.id('band-1').click()
    await ui.id('row-20').click()

    await expect(ui.id('word-screen')).toBeVisible()
    await expect(ui.id('word-lemma')).toBeVisible()
    await expect(ui.id('word-rank')).toHaveText('#20')
    await expect(ui.id('word-definition')).not.toBeEmpty()
    await expect(ui.id('example-0')).toBeVisible()
    await expect(ui.id('word-status')).toHaveText('Unknown')
    await expect(ui.id('word-learn')).toHaveText('Start learning')

    await ui.id('word-learn').click()
    await expect(ui.id('word-status')).toHaveText('Learning')
    await expect(ui.id('word-learn')).toHaveText('Review now')
    await api.waitFor('learning stored', s => s.userWords.some(w => w.wordId === wordId(20) && w.status === 'learning'))

    await ui.id('word-known').click()
    await expect(ui.id('word-status')).toHaveText('Known')
    await api.waitFor('known stored', s => s.userWords.some(w => w.wordId === wordId(20) && w.status === 'known'))

    await ui.id('word-reset').click()
    await expect(ui.id('word-status')).toHaveText('Unknown')
    await api.waitFor('reset stored', s => !s.userWords.some(w => w.wordId === wordId(20) && w.status !== 'unknown'))

    await ui.id('word-learn').click()
    await expect(ui.id('word-learn')).toHaveText('Review now')
    await ui.id('word-learn').click()
    await expect(ui.id('review-stage')).toBeVisible()
    await ui.id('close-session').click()

    await ui.open('/band/1')
    await expect(ui.id('row-20')).toContainText('Learning')
  })

  test('back from word returns to the band it came from', async ({ page, api }) => {
    await api.seed({ words: seedWords() })
    const ui = new Ui(page)
    await ui.open('/map')
    await ui.id('band-1').click()
    await ui.id('row-30').click()
    await ui.id('back').click()
    await expect(ui.id('band-screen')).toBeVisible()
  })
})
