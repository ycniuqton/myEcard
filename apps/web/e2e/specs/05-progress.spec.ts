import { test, expect } from '../support/fixtures'
import { localDate } from '../support/api'
import { Ui } from '../support/ui'

const MASTERED = [1, 2]
const KNOWN = [3, 4, 5]
const LEARNING = [6, 7, 8, 9]
const OVERDUE = -1
const TOMORROW = 1
const FAR = 20

const seedWords = () => [
  ...MASTERED.map(rank => ({ rank, status: 'mastered' as const, dueInDays: FAR })),
  ...KNOWN.map(rank => ({ rank, status: 'known' as const, dueInDays: FAR })),
  ...LEARNING.map((rank, i) => ({ rank, status: 'learning' as const, dueInDays: i === 0 ? OVERDUE : TOMORROW })),
]

const seedDays = () => [
  { daysAgo: 1, newLearned: 3, reviewed: 4, goalMet: true },
  { daysAgo: 2, newLearned: 3, reviewed: 6, goalMet: true },
  { daysAgo: 3, newLearned: 3, reviewed: 2, goalMet: true },
  { daysAgo: 9, newLearned: 3, reviewed: 5, goalMet: true },
  { daysAgo: 10, newLearned: 3, reviewed: 5, goalMet: true },
  { daysAgo: 11, newLearned: 3, reviewed: 5, goalMet: true },
  { daysAgo: 12, newLearned: 3, reviewed: 5, goalMet: true },
]

test.describe('progress', () => {
  test('streaks, status counts, due tomorrow and review bars agree with the server stats', async ({ page, api, total }) => {
    await api.seed({ words: seedWords(), days: seedDays() })
    const stats = await api.stats()
    const ui = new Ui(page)
    await ui.open('/')
    await ui.tab('Progress')
    await expect(ui.id('progress-screen')).toBeVisible()

    expect(stats.streak.current).toBe(3)
    expect(stats.streak.best).toBe(4)
    await expect(ui.id('current-streak')).toHaveText('3 days')
    await expect(ui.id('best-streak')).toHaveText('4 days')

    await expect(ui.id('count-mastered')).toHaveText(String(MASTERED.length))
    await expect(ui.id('count-known')).toHaveText(String(KNOWN.length))
    await expect(ui.id('count-learning')).toHaveText(String(LEARNING.length))
    const unknown = total - MASTERED.length - KNOWN.length - LEARNING.length
    await expect(ui.id('count-unknown')).toHaveText(unknown.toLocaleString('en-US'))

    await expect(ui.id('due-tomorrow')).toHaveText(`Due tomorrow: ${stats.dueTomorrow}`)
    expect(stats.dueTomorrow).toBe(LEARNING.length - 1)
    await expect(ui.id(`review-bar-${localDate(-2)}`)).toHaveAttribute('title', `${localDate(-2)}: 6`)
    await expect(ui.id(`review-bar-${localDate(-1)}`)).toHaveAttribute('title', `${localDate(-1)}: 4`)
    await expect(page.locator('[data-testid^="review-bar-"]')).toHaveCount(stats.reviewsPerDay.length)
    await expect(ui.id('known-line')).toBeVisible()
  })

  test('numbers follow actions: learn, know, review move counts and today bar', async ({ page, api }) => {
    await api.seed({ words: seedWords(), days: seedDays() })
    const ui = new Ui(page)
    await ui.open('/word/20')
    await ui.id('word-learn').click()
    await expect(ui.id('word-status')).toHaveText('Learning')
    await ui.open('/word/21')
    await ui.id('word-known').click()
    await expect(ui.id('word-status')).toHaveText('Known')
    await api.waitFor('actions stored', s => s.userWords.length === seedWords().length + 2)

    await ui.open('/')
    await ui.id('start-session').click()
    await ui.id('show-answer').click()
    await ui.id('grade-good').click()
    await ui.id('close-session').click()
    await api.waitFor('review stored', s => s.dayStats.some(d => d.date === localDate() && d.reviewed === 1))

    await ui.tab('Progress')
    await expect(ui.id('count-learning')).toHaveText(String(LEARNING.length + 1))
    await expect(ui.id('count-known')).toHaveText(String(KNOWN.length + 1))
    await expect(ui.id(`review-bar-${localDate()}`)).toHaveAttribute('title', `${localDate()}: 1`)
    const stats = await api.stats()
    await expect(ui.id('due-tomorrow')).toHaveText(`Due tomorrow: ${stats.dueTomorrow}`)
  })
})
