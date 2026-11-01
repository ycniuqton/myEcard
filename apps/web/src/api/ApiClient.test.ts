import { describe, expect, it } from 'vitest'
import { ApiClient } from './ApiClient'
import { ApiErrorKind } from './ApiConfig'
import { ApiError } from './ApiError'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('ApiClient', () => {
  it('builds urls from the base and parses JSON', async () => {
    const seen: string[] = []
    const fetchImpl = (async (url: string) => {
      seen.push(url)
      return jsonResponse({ ok: true, contentVersion: 'v1' })
    }) as unknown as typeof fetch
    const client = new ApiClient({ baseUrl: '/api/', fetchImpl })
    expect(await client.health()).toEqual({ ok: true, contentVersion: 'v1' })
    expect(seen).toEqual(['/api/health'])
  })

  it('maps HTTP error bodies to ApiError with code and status', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ error: { code: 'not_found', message: 'no such word' } }, 404)) as unknown as typeof fetch
    const error = await new ApiClient({ fetchImpl }).search('x').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe(ApiErrorKind.Http)
    expect(error.status).toBe(404)
    expect(error.code).toBe('not_found')
    expect(error.isRetryable).toBe(false)
  })

  it('maps fetch failures to a retryable network error', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    const error = await new ApiClient({ fetchImpl }).state().catch(e => e)
    expect(error.kind).toBe(ApiErrorKind.Network)
    expect(error.isOffline).toBe(true)
  })

  it('times out slow requests', async () => {
    const fetchImpl = ((_: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })) as unknown as typeof fetch
    const error = await new ApiClient({ fetchImpl, timeoutMs: 20 }).state().catch(e => e)
    expect(error.kind).toBe(ApiErrorKind.Timeout)
  })

  it('treats 204 as null and sends JSON bodies', async () => {
    let body = ''
    const fetchImpl = (async (_: string, init: RequestInit) => {
      body = String(init.body)
      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch
    const client = new ApiClient({ fetchImpl })
    expect(await client.updateDay({ date: '2026-06-10', reviewed: 1 })).toBeNull()
    expect(JSON.parse(body)).toEqual({ date: '2026-06-10', reviewed: 1 })
  })
})
