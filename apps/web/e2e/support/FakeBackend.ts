import type { Page, Route } from '@playwright/test'

const API_PREFIX = '/api'
const PUBLIC_PATHS = ['/health', '/content/words', '/content/credits']
const TOKEN_PREFIX = 'fake.'
const HTTP_OK = 200
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_FOUND = 404

type Row = Record<string, unknown>
type UserData = { settings: Row; userWords: Map<string, Row>; dayStats: Map<string, Row>; reviewLogs: Map<string, Row> }
type SyncBody = { changes: { userWords?: Row[]; dayStats?: Row[]; reviewLogs?: Row[]; settings?: Row } }

/**
 * Per-user in-memory API for the fake-auth e2e: requires a fake Bearer token, keeps each user's rows apart and
 * lets the public content calls through to the real server.
 */
export class FakeBackend {
  readonly unauthenticated: string[] = []
  private readonly users = new Map<string, UserData>()

  async install(page: Page): Promise<void> {
    await page.route(`**${API_PREFIX}/**`, route => this.handle(route))
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request()
    const path = new URL(request.url()).pathname.slice(API_PREFIX.length)
    if (PUBLIC_PATHS.includes(path)) return route.continue()
    const userId = this.userOf(request.headers()['authorization'])
    if (!userId) {
      this.unauthenticated.push(path)
      return route.fulfill(this.json({ error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token' } }, HTTP_UNAUTHORIZED))
    }
    const data = this.data(userId)
    if (path === '/state') return route.fulfill(this.json(this.state(data)))
    if (path === '/sync') return route.fulfill(this.json(this.sync(data, request.postDataJSON() as SyncBody)))
    if (path === '/placement') return route.fulfill(this.json({ knownCount: 0, state: this.state(data) }))
    return route.fulfill(this.json({ error: { code: 'not_found', message: path } }, HTTP_NOT_FOUND))
  }

  private userOf(header: string | undefined): string | null {
    const token = (header ?? '').replace(/^Bearer /, '')
    const parts = token.split('.')
    return token.startsWith(TOKEN_PREFIX) && parts.length === 3 ? parts[1] : null
  }

  private data(userId: string): UserData {
    let data = this.users.get(userId)
    if (!data) {
      const settings = { dailyNew: 5, theme: 'system', voice: 'us', activeListId: 'ngsl', placementDone: false }
      data = { settings, userWords: new Map(), dayStats: new Map(), reviewLogs: new Map() }
      this.users.set(userId, data)
    }
    return data
  }

  private state(data: UserData) {
    return {
      settings: data.settings, userWords: [...data.userWords.values()], dayStats: [...data.dayStats.values()],
      reviewLogs: [...data.reviewLogs.values()], serverTime: new Date().toISOString(),
    }
  }

  private sync(data: UserData, body: SyncBody) {
    const { changes } = body
    for (const row of changes.userWords ?? []) data.userWords.set(String(row.wordId), row)
    for (const row of changes.dayStats ?? []) data.dayStats.set(String(row.date), row)
    for (const row of changes.reviewLogs ?? []) data.reviewLogs.set(String(row.id), row)
    if (changes.settings) data.settings = changes.settings
    const state = this.state(data)
    return { serverChanges: { userWords: state.userWords, dayStats: state.dayStats, settings: state.settings }, serverTime: state.serverTime }
  }

  private json(body: unknown, status = HTTP_OK) {
    return { status, contentType: 'application/json', body: JSON.stringify(body) }
  }
}
