import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { Tab } from './fixtures'

type TabName = (typeof Tab)[keyof typeof Tab]

/** Navigation and wait helpers shared by the specs. */
export class Ui {
  constructor(readonly page: Page) {}

  id(testId: string) {
    return this.page.getByTestId(testId)
  }

  async open(path = '/'): Promise<void> {
    await this.page.goto(path)
  }

  async tab(name: TabName): Promise<void> {
    await this.page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name }).click()
  }

  async openToday(): Promise<void> {
    await this.open('/')
    await expect(this.id('today-screen')).toBeVisible()
  }

  async openSettings(): Promise<void> {
    await this.tab('Progress')
    await this.page.getByRole('button', { name: /settings/i }).first().click()
    await expect(this.id('settings-screen')).toBeVisible()
  }

  async answerNewWords(actions: string[]): Promise<void> {
    for (let i = 0; i < actions.length; i++) {
      const before = await this.text('session-counter')
      await this.id(actions[i]).click()
      if (i < actions.length - 1) await expect(this.id('session-counter')).not.toHaveText(before)
    }
  }

  async text(testId: string): Promise<string> {
    return ((await this.id(testId).textContent()) ?? '').trim()
  }

  async number(testId: string): Promise<number> {
    const raw = await this.text(testId)
    return Number(raw.replace(/[^0-9.]/g, ''))
  }
}
