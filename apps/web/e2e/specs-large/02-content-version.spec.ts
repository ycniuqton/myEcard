import { test, expect } from '../support/fixtures'
import { Ui } from '../support/ui'

const DB_NAME = 'wordmap'
const STORE = 'wordCache'
const STALE_VERSION = '1'
const CORE_COUNT = 2809
const EXTENDED_KNOWN_RANK = 5000
const SLOW_WORDS_MS = 1500
const REFRESH_TIMEOUT_MS = 15_000
const KNOWN = [1, 2, 3, EXTENDED_KNOWN_RANK]
const FAR = 30
const TOTAL_LABEL = '10,000'

const staleCache = async (ui: Ui) =>
  ui.page.evaluate(
    ([name, store, version, keep]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(name as string)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(store as string, 'readwrite')
          const os = tx.objectStore(store as string)
          const all = os.getAll()
          all.onsuccess = () => {
            const row = all.result[0]
            os.clear()
            os.put({ ...row, contentVersion: version, words: row.words.slice(0, keep as number) })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    [DB_NAME, STORE, STALE_VERSION, CORE_COUNT],
  )

test.describe('content version refresh', () => {
  test('an outdated cached word list is replaced and progress survives', async ({ page, api }) => {
    await api.seed({ words: KNOWN.map(rank => ({ rank, status: 'known' as const, dueInDays: FAR })) })
    const ui = new Ui(page)
    await ui.openToday()
    await expect(ui.id('known-count')).toHaveText(`${KNOWN.length} / ${TOTAL_LABEL}`)
    await staleCache(ui)

    await page.route('**/api/content/words', async route => {
      await new Promise(resolve => setTimeout(resolve, SLOW_WORDS_MS))
      await route.continue()
    })
    await page.reload()
    await expect(ui.id('known-count')).toHaveText(`${KNOWN.length - 1} / ${CORE_COUNT.toLocaleString('en-US')}`)
    await expect(ui.id('known-count')).toHaveText(`${KNOWN.length} / ${TOTAL_LABEL}`, { timeout: REFRESH_TIMEOUT_MS })
    await expect(ui.id('next-word-4')).toHaveText('word4')
    expect((await api.state()).userWords).toHaveLength(KNOWN.length)
  })
})
