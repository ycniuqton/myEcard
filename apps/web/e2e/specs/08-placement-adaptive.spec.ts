import { test, expect } from '../support/fixtures'
import { wordId } from '../support/api'
import { Learners, MIN_PROBES_TO_FINISH, PlacementDriver, PlacementId } from '../support/placement'
import { Ui } from '../support/ui'

const LEARNER_RANK = 800
const SLIDER_TARGET = 1500
const SLIDER_STEP = 50
const FORGETS_EVERY = 4
const OLD_ASSUMED = [2000, 2001, 2002]
const STUDIED = [3, 4]
const RETAKE_LEVEL = 300
const SECOND_RETAKE_LEVEL = 200

test.describe('adaptive placement', () => {
  test('finish now unlocks after 3 probes and leads to the result', async ({ page, api, ranks }) => {
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await ui.id('take-placement').click()
    await expect(ui.id(PlacementId.FinishNow)).toBeDisabled()
    await driver.answerProbes(Learners.knowsEverything(), MIN_PROBES_TO_FINISH - 1)
    await expect(ui.id(PlacementId.FinishNow)).toBeDisabled()
    await driver.answerProbes(Learners.knowsEverything(), 1)
    await expect(ui.id(PlacementId.FinishNow)).toBeEnabled()
    await expect(ui.id(PlacementId.Dots)).toHaveAttribute('data-done', String(MIN_PROBES_TO_FINISH))
    await ui.id(PlacementId.FinishNow).click()
    await expect(ui.id(PlacementId.Result)).toBeVisible()
    expect(await driver.level()).toBeGreaterThan(LEARNER_RANK)
    await ui.id(PlacementId.Accept).click()
    await expect(ui.id('today-screen')).toBeVisible()
    await api.waitFor('placement saved', s => s.settings.placementDone)
  })

  test('slider changes the level and what is marked known while the map percent stays', async ({ page, api, ranks }) => {
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await ui.id('take-placement').click()
    await driver.playToResult(Learners.upTo(LEARNER_RANK))
    const before = { level: await driver.level(), marked: await driver.marked(), percent: await ui.number(PlacementId.Percent) }
    await ui.id(PlacementId.Slider).fill(String(SLIDER_TARGET))
    await expect(ui.id(PlacementId.Level)).toHaveText(String(SLIDER_TARGET))
    expect(await driver.marked()).toBeGreaterThan(before.marked)
    expect(await ui.number(PlacementId.Percent)).toBe(before.percent)
    const marked = await driver.marked()
    await ui.id(PlacementId.Accept).click()
    await expect(ui.id('today-screen')).toBeVisible()
    const state = await api.waitFor('adjusted placement saved', s => s.settings.placementDone && s.userWords.length === marked)
    const ids = new Set(state.userWords.map(w => w.wordId))
    expect(ids.has(wordId(SLIDER_TARGET - 100 - SLIDER_STEP))).toBe(true)
    expect(ids.has(wordId(SLIDER_TARGET + SLIDER_STEP))).toBe(false)
  })

  test('a learner who claims made-up words gets a lower share of the map known', async ({ page, ranks }) => {
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await ui.id('take-placement').click()
    await driver.playToResult(Learners.partialUpTo(LEARNER_RANK, FORGETS_EVERY))
    const honest = await ui.number(PlacementId.Percent)

    await ui.id(PlacementId.Retake).click()
    const claimer = new PlacementDriver(page, ranks)
    await claimer.playToResult(Learners.partialOverClaimer(LEARNER_RANK, FORGETS_EVERY))
    expect(await ui.number(PlacementId.Percent)).toBeLessThanOrEqual(honest)
  })

  test('retake keeps learned words and clears only earlier assumed ones', async ({ page, api, ranks }) => {
    const assumed = OLD_ASSUMED.map(rank => ({ rank, status: 'known' as const, assumed: true, dueInDays: 40 }))
    const studied = STUDIED.map(rank => ({ rank, status: 'learning' as const, dueInDays: 1 }))
    await api.seed({ words: [...assumed, ...studied] })
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await ui.openSettings()
    await ui.id('retake-placement').click()
    await expect(ui.id('placement-intro')).toBeVisible()
    await ui.id('begin-placement').click()
    await driver.playToResult(Learners.upTo(RETAKE_LEVEL))
    await ui.id(PlacementId.Slider).fill(String(SECOND_RETAKE_LEVEL))
    await ui.id(PlacementId.Accept).click()
    await expect(ui.id('today-screen')).toBeVisible()
    const state = await api.waitFor('retake saved', s => !s.userWords.some(w => w.wordId === wordId(OLD_ASSUMED[0]) && w.status === 'known'))
    const status = (rank: number) => state.userWords.find(w => w.wordId === wordId(rank))?.status ?? 'unknown'
    OLD_ASSUMED.forEach(rank => expect(status(rank)).toBe('unknown'))
    STUDIED.forEach(rank => expect(status(rank)).toBe('learning'))
  })

  test('placement works offline and syncs on reconnect', async ({ page, context, api, ranks }) => {
    const ui = new Ui(page)
    const driver = new PlacementDriver(page, ranks)
    await ui.open('/')
    await expect(ui.id('welcome')).toBeVisible()
    await context.setOffline(true)
    await ui.id('take-placement').click()
    await driver.playToResult(Learners.upTo(LEARNER_RANK))
    const marked = await driver.marked()
    await ui.id(PlacementId.Accept).click()
    await expect(ui.id('today-screen')).toBeVisible()
    await expect(ui.id('known-percent')).not.toHaveText('0%')
    expect((await api.state()).settings.placementDone).toBe(false)

    await context.setOffline(false)
    const state = await api.waitFor('offline placement synced', s => s.settings.placementDone && s.userWords.length === marked)
    expect(state.userWords.every(w => w.status === 'known')).toBe(true)
    const logs = ((await api.exportSnapshot()).reviewLogs as { mode: string }[]).filter(l => l.mode === 'placement')
    expect(logs.length).toBeGreaterThan(0)
  })
})


