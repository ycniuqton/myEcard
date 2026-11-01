import { test, expect } from '../support/fixtures'
import { localDate, wordId } from '../support/api'
import { Ui } from '../support/ui'

const OVERDUE = -1
const REVIEW_RANKS = [11, 12, 13]

const dueSeed = () => REVIEW_RANKS.map(rank => ({ rank, status: 'learning' as const, dueInDays: OVERDUE }))

async function reviewLogCount(api: { exportSnapshot: () => Promise<Record<string, any>> }, id: string): Promise<number> {
  const snapshot = await api.exportSnapshot()
  return (snapshot.reviewLogs as { wordId: string }[]).filter(l => l.wordId === id).length
}

test.describe('persistence', () => {
  test('server is the source of truth: a fresh browser sees the same progress', async ({ page, browser, api, total }) => {
    await api.seed({ dailyNew: 3, words: dueSeed() })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('due-line')).toContainText('3 reviews')
    await expect(ui.id('start-session')).toBeEnabled()
    await ui.id('start-session').click()
    for (let i = 0; i < REVIEW_RANKS.length; i++) {
      await ui.id('show-answer').click()
      await ui.id('grade-good').click()
    }
    await ui.answerNewWords(['learn-it', 'learn-it', 'learn-it'])
    await expect(ui.id('summary-streak')).toHaveText('1')
    await ui.id('summary-done').click()
    await expect(ui.id('today-done')).toBeVisible()
    await api.waitFor('session synced', s => s.userWords.length === 6)

    await page.reload()
    await expect(ui.id('today-done')).toBeVisible()
    await expect(ui.id('streak-count')).toHaveText('1')

    const other = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const fresh = new Ui(await other.newPage())
    await fresh.openToday()
    await expect(fresh.id('today-done')).toBeVisible()
    await expect(fresh.id('streak-count')).toHaveText('1')
    await expect(fresh.id('known-count')).toContainText(`0 / ${total.toLocaleString('en-US')}`)
    await fresh.tab('Progress')
    await expect(fresh.id('count-learning')).toHaveText('6')
    await other.close()
  })

  test('deep link on a fresh browser keeps the route when onboarding is done', async ({ page, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/progress')
    await expect(ui.id('progress-screen')).toBeVisible()
    await page.waitForTimeout(500)
    expect(new URL(page.url()).pathname).toBe('/progress')
  })
})

test.describe('offline queue', () => {
  test('review done offline is reflected, then synced once when back online', async ({ page, context, api }) => {
    await api.seed({ dailyNew: 3, words: dueSeed() })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('due-line')).toContainText('3 reviews')
    await expect(ui.id('start-session')).toBeEnabled()
    await ui.id('start-session').click()
    await expect(ui.id('session-counter')).toHaveText('1 / 6')

    await context.setOffline(true)
    await ui.id('show-answer').click()
    await ui.id('grade-good').click()
    await expect(ui.id('session-counter')).toHaveText('2 / 6')
    await ui.id('close-session').click()
    await expect(ui.id('due-line')).toContainText('2 reviews')

    const offlineServer = await api.state()
    expect(offlineServer.dayStats.find(d => d.date === localDate())?.reviewed ?? 0).toBe(0)
    expect(await reviewLogCount(api, wordId(11))).toBe(0)

    await context.setOffline(false)
    const state = await api.waitFor('offline review flushed', s => s.dayStats.some(d => d.date === localDate() && d.reviewed === 1))
    expect(state.dayStats.find(d => d.date === localDate())?.reviewed).toBe(1)
    const synced = state.userWords.find(w => w.wordId === wordId(11))
    expect(synced?.reps).toBeGreaterThan(1)
    expect(await reviewLogCount(api, wordId(11))).toBe(1)

    await page.reload()
    await expect(ui.id('due-line')).toContainText('2 reviews')
    await page.waitForTimeout(1000)
    expect(await reviewLogCount(api, wordId(11))).toBe(1)
    expect((await api.state()).dayStats.find(d => d.date === localDate())?.reviewed).toBe(1)
  })

  test('word actions done offline are queued and applied after reconnect', async ({ page, context, api }) => {
    await api.seed()
    const ui = new Ui(page)
    await ui.open('/word/40')
    await expect(ui.id('word-screen')).toBeVisible()
    await expect(ui.id('word-known')).toBeVisible()
    await expect(ui.id('word-definition')).toBeVisible()
    await context.setOffline(true)
    await ui.id('word-known').click()
    await expect(ui.id('word-status')).toHaveText('Known')
    expect((await api.state()).userWords.some(w => w.wordId === wordId(40))).toBe(false)
    await context.setOffline(false)
    await api.waitFor('offline know flushed', s => s.userWords.some(w => w.wordId === wordId(40) && w.status === 'known'))
    await ui.open('/map')
    await expect(ui.id('map-known')).toHaveText('1 known')
  })

  test('a session started while offline grades locally and syncs after reconnect', async ({ page, context, api }) => {
    await api.seed({ words: dueSeed() })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('due-line')).toContainText('3 reviews')
    await context.setOffline(true)
    await ui.id('start-session').click()
    await expect(ui.id('review-stage')).toBeVisible()
    await ui.id('show-answer').click()
    await ui.id('grade-easy').click()
    await context.setOffline(false)
    await api.waitFor('easy flushed', s => s.dayStats.some(d => d.date === localDate() && d.reviewed === 1))
    expect(await reviewLogCount(api, wordId(11))).toBe(1)
  })
})
