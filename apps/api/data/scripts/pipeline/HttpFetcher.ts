import { HttpHeader, PipelineLimits } from './PipelineConfig'
import { RateLimiter } from './RateLimiter'

export enum HttpStatus {
  Ok = 200,
  NotFound = 404,
  TooManyRequests = 429,
  ServerError = 500,
}

export type FetchOutcome = { status: number; body: string; retryAfterMs?: number }

/** GET with polite rate limiting; 429 cools down globally, server errors retry briefly then give up. */
export class HttpFetcher {
  constructor(private readonly limiter: RateLimiter) {}

  async getText(url: string): Promise<FetchOutcome> {
    let serverErrors = 0
    let last: FetchOutcome = { status: 0, body: '' }
    for (let attempt = 0; attempt < PipelineLimits.FetchRetries; attempt++) {
      await this.limiter.acquire()
      last = await this.tryOnce(url)
      if (last.status === HttpStatus.Ok || last.status === HttpStatus.NotFound) return last
      if (last.status === HttpStatus.TooManyRequests) this.limiter.coolDown(this.backoff(attempt, last))
      else if (++serverErrors >= PipelineLimits.ServerErrorRetries) return last
      else await RateLimiter.sleep(this.backoff(serverErrors - 1, last))
    }
    return last
  }

  private async tryOnce(url: string): Promise<FetchOutcome> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(PipelineLimits.FetchTimeoutMs) })
      const retryAfter = Number(res.headers.get(HttpHeader.RetryAfter))
      const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * PipelineLimits.MillisPerSecond : undefined
      return { status: res.status, body: await res.text(), retryAfterMs }
    } catch {
      return { status: 0, body: '' }
    }
  }

  private backoff(attempt: number, outcome: FetchOutcome): number {
    const exp = PipelineLimits.BackoffBaseMs * 2 ** attempt
    const hinted = outcome.status === HttpStatus.TooManyRequests ? (outcome.retryAfterMs ?? 0) : 0
    return Math.min(PipelineLimits.BackoffMaxMs, Math.max(exp, hinted))
  }
}
