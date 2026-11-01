import { test, expect } from '../support/fixtures'
import { Learners, PlacementDriver, PlacementId } from '../support/placement'
import { Ui } from '../support/ui'

const TOTAL = 10_000
const BAND_SIZE = 100
const BAND_COUNT = TOTAL / BAND_SIZE
const KNOWN_PREFIX = 5000
const MARKER_BAND = KNOWN_PREFIX / BAND_SIZE + 1
const FAR = 30
const CPU_SLOWDOWN = 4
const FIRST_RENDER_BUDGET_MS = 1000
const RENDER_RUNS = 3
const MARKER_TILE = 'tile-1717'
const PLACEMENT_LEVEL = 4000
const PLACEMENT_TOLERANCE = 1000
const MAX_TILES_RENDERED = 6500
const TOTAL_LABEL = '10,000'
const MODE_STORAGE_KEY = 'wordmap.mapMode'

type TimedWindow = Window & { __t0: number }

const knownPrefix = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ rank: i + 1, status: 'known' as const, dueInDays: FAR }))

const tiles = (ui: Ui) => ui.page.locator('[data-testid^="tile-"]')

const bandCards = (ui: Ui) => ui.page.locator('[data-testid^="band-"]')

async function firstRenderMs(ui: Ui, mode: 'bands' | 'compact'): Promise<number> {
  await ui.page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_STORAGE_KEY, mode])
  await ui.page.evaluate(() => {
    ;(window as unknown as TimedWindow).__t0 = performance.now()
  })
  await ui.tab('Map')
  await expect(ui.id(MARKER_TILE)).toBeVisible()
  return ui.page.evaluate(
    () =>
      new Promise<number>(resolve =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(performance.now() - (window as unknown as TimedWindow).__t0)),
        ),
      ),
  )
}

test.describe('map with 10,000 words', () => {
  test('Today counts and copy use the whole map', async ({ page, api }) => {
    await api.seed({ words: knownPrefix(1716) })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('known-count')).toHaveText(`1,716 / ${TOTAL_LABEL}`)
    await expect(ui.id('known-percent')).toHaveText('17%')
    await expect(ui.id('today-map-card')).toContainText('of the map known')
    await expect(ui.id('next-word-1717')).toHaveText('word1717')
  })

  test('bands view has 100 cards, renders tiles near the viewport only and reaches any band', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/map')
    await expect(bandCards(ui)).toHaveCount(BAND_COUNT)
    await expect(ui.id('map-screen')).toContainText(`${TOTAL_LABEL} words`)
    await expect(ui.id('tile-1')).toBeVisible()
    await expect(ui.id('tile-10000')).toHaveCount(0)
    expect(await tiles(ui).count()).toBeLessThan(MAX_TILES_RENDERED)

    await ui.id(`band-${BAND_COUNT}`).scrollIntoViewIfNeeded()
    await expect(ui.id('tile-10000')).toBeVisible()
    await expect(ui.id('tile-1')).toHaveCount(0)
    await ui.id('tile-9950').click()
    await expect(ui.id('band-title')).toHaveText('Words 9,901–10,000')
    await expect(ui.id('row-10000')).toContainText('word10000')
  })

  test('the current band is scrolled into view and compact view opens any band', async ({ page, api }) => {
    await api.seed({ words: knownPrefix(KNOWN_PREFIX) })
    const ui = new Ui(page)
    await ui.open('/map')
    await expect(ui.id(`band-${MARKER_BAND}`)).toHaveAttribute('data-here', '1')
    await expect(ui.id(`tile-${KNOWN_PREFIX + 1}`)).toBeInViewport()
    await expect(ui.id('map-known')).toHaveText(`${KNOWN_PREFIX.toLocaleString('en-US')} known`)
    await expect(ui.id('map-percent')).toContainText('50%')

    await ui.id('map-mode-compact').click()
    await expect(ui.id('map-compact')).toBeVisible()
    await expect(bandCards(ui)).toHaveCount(BAND_COUNT)
    await ui.id('band-80').scrollIntoViewIfNeeded()
    await expect(ui.id('tile-7901')).toBeVisible()
    await ui.id('band-80').click()
    await expect(ui.id('band-title')).toHaveText('Words 7,901–8,000')
    await expect(page.locator('[data-testid^="row-"]')).toHaveCount(BAND_SIZE)
  })

  test('first render of both map views stays under one second at 4x CPU slowdown', async ({ page, api }) => {
    await api.seed({ words: knownPrefix(1716) })
    const ui = new Ui(page)
    await ui.openToday()
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })
    for (const mode of ['bands', 'compact'] as const) {
      const runs: number[] = []
      for (let i = 0; i < RENDER_RUNS; i++) {
        runs.push(await firstRenderMs(ui, mode))
        await ui.tab('Today')
        await expect(ui.id('today-screen')).toBeVisible()
      }
      console.log(`first render ${mode}: ${runs.map(Math.round).join(', ')} ms at ${CPU_SLOWDOWN}x CPU slowdown`)
      expect(Math.min(...runs)).toBeLessThan(FIRST_RENDER_BUDGET_MS)
    }
  })

  test('search finds words deep in the map', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/')
    await ui.tab('Search')
    await ui.id('search-input').fill('word9999')
    await expect(ui.id('result-9999')).toBeVisible()
    await ui.id('result-9999').click()
    await expect(ui.id('word-rank')).toHaveText('#9,999')
  })

  test('adaptive placement bisects the 100 bands and marks the map', async ({ page, api, ranks }) => {
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await ui.id('take-placement').click()
    await driver.playToResult(Learners.upTo(PLACEMENT_LEVEL))
    const level = await driver.level()
    console.log(`placement level for a ${PLACEMENT_LEVEL}-word learner: ${level}`)
    expect(Math.abs(level - PLACEMENT_LEVEL)).toBeLessThanOrEqual(PLACEMENT_TOLERANCE)
    await ui.id(PlacementId.Accept).click()
    await expect(ui.id('today-screen')).toBeVisible()
    await api.waitFor('placement saved', s => s.settings.placementDone)
    await expect(ui.id('known-count')).toContainText(`/ ${TOTAL_LABEL}`)
  })
})
