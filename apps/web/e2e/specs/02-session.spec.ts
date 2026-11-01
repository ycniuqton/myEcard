import { test, expect } from '../support/fixtures'
import { localDate, wordId, type TestApi } from '../support/api'
import { Ui } from '../support/ui'

const OVERDUE = -1
const REVIEW_RANKS = [11, 12, 13]
const NEW_PER_DAY = 3
const LEARN_MORE_COUNT = 20

function reviewSeed() {
  return REVIEW_RANKS.map(rank => ({ rank, status: 'learning' as const, dueInDays: OVERDUE }))
}

async function grade(ui: Ui, name: string, endsSession = false): Promise<void> {
  const before = await ui.text('session-counter')
  await ui.id('show-answer').click()
  await ui.id(`grade-${name}`).click()
  if (!endsSession) await expect(ui.id('session-counter')).not.toHaveText(before)
}

async function playReviewsAndNewWords(ui: Ui): Promise<void> {
  await expect(ui.id('session-counter')).toHaveText('1 / 6')
  await ui.id('show-answer').click()
  await expect(ui.id('grade-again-interval')).toHaveText('<10m')
  await ui.id('grade-again').click()
  await expect(ui.id('session-counter')).toHaveText('2 / 7')
  await grade(ui, 'good')
  await grade(ui, 'easy')
  await expect(ui.id('new-card')).toBeVisible()
  await expect(ui.id('back-word')).toHaveText('the')
  await ui.answerNewWords(['know-it', 'learn-it', 'learn-it'])
  await expect(ui.id('session-counter')).toHaveText('7 / 7')
  await expect(ui.id('front-word')).toBeVisible()
  await grade(ui, 'good', true)
}

async function expectSummary(ui: Ui): Promise<void> {
  await expect(ui.id('summary-new')).toHaveText('2')
  await expect(ui.id('summary-reviews')).toHaveText('3')
  await expect(ui.id('summary-accuracy')).toHaveText('67%')
  await expect(ui.id('summary-streak')).toHaveText('1')
  await expect(ui.id('summary-streak-note')).toContainText('+1')
  await expect(ui.id('summary-word')).toHaveCount(NEW_PER_DAY)
}

async function expectServerAfterSession(api: TestApi): Promise<void> {
  const state = await api.waitFor('session synced', s => s.dayStats.some(d => d.date === localDate() && d.reviewed === 4))
  const today = state.dayStats.find(d => d.date === localDate())
  expect(today).toMatchObject({ newLearned: NEW_PER_DAY, reviewed: 4, goalMet: true })
  const byId = new Map(state.userWords.map(w => [w.wordId, w]))
  expect(byId.get(wordId(1))?.status).toBe('known')
  expect(byId.get(wordId(2))?.status).toBe('learning')
  expect(byId.get(wordId(3))?.status).toBe('learning')
  expect(byId.get(wordId(11))?.lapses).toBe(1)
  expect(byId.get(wordId(12))?.reps).toBeGreaterThan(1)
}

async function playLearnMore(ui: Ui): Promise<void> {
  await ui.id('learn-more').click()
  await expect(ui.id('session-counter')).toHaveText(`1 / ${LEARN_MORE_COUNT}`)
  await ui.answerNewWords(Array(LEARN_MORE_COUNT).fill('know-it'))
  await expect(ui.id('summary-streak')).toHaveText('1')
  await expect(ui.id('summary-streak-note')).not.toContainText('+1')
  await ui.id('summary-done').click()
  await expect(ui.id('today-done')).toBeVisible()
  await expect(ui.id('streak-count')).toHaveText('1')
  await expect(ui.id('learn-more')).toBeVisible()
}

test.describe('Today states', () => {
  test('pending card reflects due reviews and daily new words', async ({ page, api, total }) => {
    await api.seed({ dailyNew: 4, words: reviewSeed() })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('due-line')).toHaveText('3 reviews · 4 new words')
    await expect(ui.id('known-count')).toContainText(`0 / ${total.toLocaleString('en-US')}`)
    await expect(ui.id('start-session')).toBeVisible()
    await expect(ui.id('today-done')).toHaveCount(0)
    await expect(ui.id('next-word-1')).toHaveText('the')
  })

  test('goal met shows the done state instead of the start button', async ({ page, api }) => {
    await api.seed({ dailyNew: 3, days: [{ daysAgo: 0, newLearned: 3, reviewed: 0, goalMet: true }] })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('today-done')).toBeVisible()
    await expect(ui.id('start-session')).toHaveCount(0)
  })
})

test.describe('daily session', () => {
  test('full session: again requeue, new words, summary, streak once, learn more once', async ({ page, api }) => {
    await api.seed({ dailyNew: NEW_PER_DAY, words: reviewSeed() })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('streak-count')).toHaveText('0')
    await ui.id('start-session').click()
    await playReviewsAndNewWords(ui)
    await expectSummary(ui)
    await expectServerAfterSession(api)
    await ui.id('summary-done').click()
    await expect(ui.id('today-done')).toBeVisible()
    await expect(ui.id('streak-count')).toHaveText('1')
    await expect(ui.id('streak-count')).toHaveAttribute('data-lit', 'true')
    await playLearnMore(ui)
  })

  test('closing a session keeps progress made so far and returns to Today', async ({ page, api }) => {
    await api.seed({ dailyNew: NEW_PER_DAY, words: reviewSeed() })
    const ui = new Ui(page)
    await ui.openToday()
    await ui.id('start-session').click()
    await grade(ui, 'good')
    await ui.id('close-session').click()
    await expect(ui.id('today-screen')).toBeVisible()
    await expect(ui.id('due-line')).toContainText('2 reviews')
    await api.waitFor('review stored', s => s.dayStats.some(d => d.reviewed === 1))
  })
})
