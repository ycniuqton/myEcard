import { PlacementConfig } from '@wordmap/shared'
import { test, expect } from '../support/fixtures'
import { LEVEL_TOLERANCE, Learners, PlacementDriver, PlacementId } from '../support/placement'
import { Ui } from '../support/ui'

const LEARNER_RANK = 800
const MAX_PROBES = PlacementConfig.MAX_PROBES
const PERCENT_ROUNDING = 1
const FULL = 100

const percentBounds = (total: number) => ({
  min: Math.max(0, Math.floor(((LEARNER_RANK - LEVEL_TOLERANCE) / total) * FULL) - PERCENT_ROUNDING),
  max: Math.ceil(((LEARNER_RANK + LEVEL_TOLERANCE) / total) * FULL) + PERCENT_ROUNDING,
})

test.describe('first run and placement', () => {
  test('fresh install lands on welcome and skip starts from word 1', async ({ page, api }) => {
    const ui = new Ui(page)
    await ui.open('/')
    await expect(ui.id('welcome')).toBeVisible()
    await expect(page.getByText('Learn the words that matter most.')).toBeVisible()
    await ui.id('skip-placement').click()
    await expect(ui.id('today-screen')).toBeVisible()
    const state = await api.waitFor('placement done', s => s.settings.placementDone)
    expect(state.userWords).toHaveLength(0)
    await page.reload()
    await expect(ui.id('today-screen')).toBeVisible()
  })

  test('placement fast path finds a learner near rank 800 and maps a matching share of the map as known', async ({ page, api, ranks, total }) => {
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await ui.id('take-placement').click()
    await expect(ui.id(PlacementId.Card)).toBeVisible()
    await expect(ui.id(PlacementId.FinishNow)).toBeDisabled()
    await expect(ui.id(PlacementId.Dots).locator('span')).toHaveCount(MAX_PROBES)

    await driver.playToResult(Learners.upTo(LEARNER_RANK))
    const level = await driver.level()
    expect(Math.abs(level - LEARNER_RANK)).toBeLessThanOrEqual(LEVEL_TOLERANCE)
    const bounds = percentBounds(total)
    const percent = await ui.number(PlacementId.Percent)
    expect(percent).toBeGreaterThanOrEqual(bounds.min)
    expect(percent).toBeLessThanOrEqual(bounds.max)
    const marked = await driver.marked()
    await ui.id(PlacementId.Accept).click()
    await expect(ui.id('today-screen')).toBeVisible()

    const state = await api.waitFor('placement saved', s => s.settings.placementDone && s.userWords.length > 0)
    expect(state.userWords).toHaveLength(marked)
    expect(state.userWords.every(w => w.status === 'known')).toBe(true)
    const knownPercent = await ui.number('known-percent')
    expect(knownPercent).toBeGreaterThanOrEqual(bounds.min)
    expect(knownPercent).toBeLessThanOrEqual(bounds.max)
    const first = await ui.id('today-screen').locator('[data-testid^="next-word-"]').first().getAttribute('data-testid')
    const nextRank = Number(first?.replace('next-word-', ''))
    expect(Math.abs(nextRank - level)).toBeLessThanOrEqual(LEVEL_TOLERANCE)
    expect(nextRank).toBeGreaterThan(1)
    await ui.tab('Map')
    await expect(ui.id('map-known')).toContainText(`${state.userWords.length.toLocaleString('en-US')} known`)
  })
  test('retake from settings opens the intro and can be cancelled', async ({ page, api }) => {
    await api.seed({ words: [{ rank: 1, status: 'known' }, { rank: 2, status: 'learning' }] })
    const ui = new Ui(page)
    await ui.open('/')
    await ui.openSettings()
    await ui.id('retake-placement').click()
    await expect(ui.id('placement-intro')).toBeVisible()
    await ui.id('cancel-placement').click()
    await expect(ui.id('settings-screen')).toBeVisible()
  })
})


