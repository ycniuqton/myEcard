import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TestApp, TestClock } from './TestApp'

describe('static hosting', () => {
  it('serves files and falls back to index.html for SPA routes, keeping API 404s as JSON', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'wm-dist-'))
    mkdirSync(join(dist, 'assets'))
    writeFileSync(join(dist, 'index.html'), '<html>spa</html>')
    writeFileSync(join(dist, 'assets', 'a.js'), 'console.log(1)')
    const app = await TestApp.create(new TestClock(), dist)
    const asset = await app.inject({ method: 'GET', url: '/assets/a.js' })
    expect(asset.statusCode).toBe(200)
    const spa = await app.inject({ method: 'GET', url: '/word/ngsl:0001' })
    expect(spa.statusCode).toBe(200)
    expect(spa.body).toContain('spa')
    const api404 = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(api404.statusCode).toBe(404)
    expect(api404.json().error.code).toBe('not_found')
    await app.close()
  })
})
