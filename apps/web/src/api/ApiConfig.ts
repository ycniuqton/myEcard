export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
}

export enum ApiErrorKind {
  Network = 'network',
  Timeout = 'timeout',
  Http = 'http',
  Parse = 'parse',
}

export enum WordAction {
  Know = 'know',
  Learn = 'learn',
  Reset = 'reset',
}

/** Transport constants for the WordMap REST API. */
export class ApiConfig {
  static readonly DEFAULT_BASE = '/api'
  static readonly TIMEOUT_MS = 15_000
  static readonly JSON_TYPE = 'application/json'
  static readonly HEADER_CONTENT_TYPE = 'Content-Type'
  static readonly HTTP_NO_CONTENT = 204
  static readonly HTTP_SERVER_ERROR = 500
  static readonly NO_STATUS = 0
}

/** Endpoint paths of the API contract. */
export class ApiRoutes {
  static readonly HEALTH = '/health'
  static readonly WORDS = '/content/words'
  static readonly CREDITS = '/content/credits'
  static readonly STATE = '/state'
  static readonly SETTINGS = '/settings'
  static readonly PLACEMENT = '/placement'
  static readonly REVIEWS = '/reviews'
  static readonly SESSION = '/session'
  static readonly SESSION_DAY = '/session/day'
  static readonly STATS = '/stats'
  static readonly SYNC = '/sync'
  static readonly EXPORT = '/export'
  static readonly IMPORT = '/import'
  static readonly PROGRESS = '/progress'

  static search(q: string, limit?: number): string {
    const params = new URLSearchParams({ q })
    if (limit !== undefined) params.set('limit', String(limit))
    return `/words/search?${params.toString()}`
  }

  static wordAction(id: string, action: WordAction): string {
    return `/words/${encodeURIComponent(id)}/${action}`
  }

  static session(date: string): string {
    return `${ApiRoutes.SESSION}?date=${encodeURIComponent(date)}`
  }

  static stats(date?: string): string {
    return date ? `${ApiRoutes.STATS}?date=${encodeURIComponent(date)}` : ApiRoutes.STATS
  }
}
