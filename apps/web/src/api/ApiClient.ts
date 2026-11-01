import type {
  ApiErrorBody, Credit, DayUpdateRequest, DayUpdateResponse, ExportSnapshot, HealthResponse,
  PlacementResponse, PlacementSubmission, ReviewRequest, ReviewResponse, SearchResponse, SessionResponse,
  Settings, SettingsUpdateRequest, StateResponse, StatsResponse, SyncPayload, SyncResponse,
  WordActionResponse, WordsResponse,
} from '@wordmap/shared'
import { ApiConfig, ApiErrorKind, ApiRoutes, HttpMethod, type WordAction } from './ApiConfig'
import { ApiError } from './ApiError'
import type { AuthTokenProvider } from './AuthTokenProvider'

export type ApiClientOptions = { baseUrl?: string; timeoutMs?: number; fetchImpl?: typeof fetch; auth?: AuthTokenProvider }

type RequestSpec = { method: HttpMethod; path: string; body?: unknown }

/** Typed HTTP client for the WordMap API; every failure surfaces as ApiError. */
export class ApiClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly auth?: AuthTokenProvider

  constructor(options: ApiClientOptions = {}) {
    const envBase = import.meta.env?.VITE_API_BASE as string | undefined
    this.baseUrl = (options.baseUrl ?? envBase ?? ApiConfig.DEFAULT_BASE).replace(/\/$/, '')
    this.timeoutMs = options.timeoutMs ?? ApiConfig.TIMEOUT_MS
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init))
    this.auth = options.auth
  }

  health = () => this.get<HealthResponse>(ApiRoutes.HEALTH)
  words = () => this.get<WordsResponse>(ApiRoutes.WORDS)
  credits = () => this.get<Credit[]>(ApiRoutes.CREDITS)
  search = (q: string, limit?: number) => this.get<SearchResponse>(ApiRoutes.search(q, limit))
  state = () => this.get<StateResponse>(ApiRoutes.STATE)
  session = (date: string) => this.get<SessionResponse>(ApiRoutes.session(date))
  stats = (date?: string) => this.get<StatsResponse>(ApiRoutes.stats(date))
  exportData = () => this.get<ExportSnapshot>(ApiRoutes.EXPORT)

  updateSettings = (patch: SettingsUpdateRequest) =>
    this.send<Settings>({ method: HttpMethod.Put, path: ApiRoutes.SETTINGS, body: patch })

  placement = (req: PlacementSubmission) =>
    this.send<PlacementResponse>({ method: HttpMethod.Post, path: ApiRoutes.PLACEMENT, body: req })

  wordAction = (id: string, action: WordAction) =>
    this.send<WordActionResponse>({ method: HttpMethod.Post, path: ApiRoutes.wordAction(id, action) })

  review = (req: ReviewRequest) =>
    this.send<ReviewResponse>({ method: HttpMethod.Post, path: ApiRoutes.REVIEWS, body: req })

  updateDay = (req: DayUpdateRequest) =>
    this.send<DayUpdateResponse>({ method: HttpMethod.Post, path: ApiRoutes.SESSION_DAY, body: req })

  sync = (payload: SyncPayload) =>
    this.send<SyncResponse>({ method: HttpMethod.Post, path: ApiRoutes.SYNC, body: payload })

  importData = (snapshot: ExportSnapshot) =>
    this.send<unknown>({ method: HttpMethod.Post, path: ApiRoutes.IMPORT, body: snapshot })

  resetProgress = () => this.send<unknown>({ method: HttpMethod.Delete, path: ApiRoutes.PROGRESS })

  private get<T>(path: string): Promise<T> {
    return this.send<T>({ method: HttpMethod.Get, path })
  }

  private async send<T>(spec: RequestSpec): Promise<T> {
    const res = await this.execute(spec)
    if (!res.ok) throw await this.httpError(res)
    return this.parse<T>(res)
  }

  private async execute(spec: RequestSpec): Promise<Response> {
    const first = await this.fetchWithTimeout(spec, await this.token(spec))
    const guarded = this.auth && !ApiRoutes.isPublic(spec.path)
    if (!guarded || first.status !== ApiConfig.HTTP_UNAUTHORIZED) return first
    return this.retryAfterRefresh(spec, first)
  }

  private async retryAfterRefresh(spec: RequestSpec, first: Response): Promise<Response> {
    const renewed = (await this.auth?.refresh()) === true
    const second = renewed ? await this.fetchWithTimeout(spec, await this.token(spec)) : first
    if (second.status === ApiConfig.HTTP_UNAUTHORIZED) this.auth?.onUnauthenticated()
    return second
  }

  private async token(spec: RequestSpec): Promise<string | null> {
    if (!this.auth || ApiRoutes.isPublic(spec.path)) return null
    return this.auth.accessToken()
  }

  private async fetchWithTimeout(spec: RequestSpec, token: string | null): Promise<Response> {
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    try {
      return await this.fetchImpl(`${this.baseUrl}${spec.path}`, this.init(spec, controller.signal, token))
    } catch (cause) {
      throw this.transportError(cause, timedOut)
    } finally {
      clearTimeout(timer)
    }
  }

  private init(spec: RequestSpec, signal: AbortSignal, token: string | null): RequestInit {
    const hasBody = spec.body !== undefined
    const headers: Record<string, string> = {}
    if (hasBody) headers[ApiConfig.HEADER_CONTENT_TYPE] = ApiConfig.JSON_TYPE
    if (token) headers[ApiConfig.HEADER_AUTHORIZATION] = `${ApiConfig.BEARER} ${token}`
    return {
      method: spec.method,
      signal,
      headers: Object.keys(headers).length ? headers : undefined,
      body: hasBody ? JSON.stringify(spec.body) : undefined,
    }
  }

  private transportError(cause: unknown, timedOut: boolean): ApiError {
    const message = cause instanceof Error ? cause.message : String(cause)
    return timedOut
      ? new ApiError(ApiErrorKind.Timeout, `Request timed out after ${this.timeoutMs}ms`)
      : new ApiError(ApiErrorKind.Network, message)
  }

  private async httpError(res: Response): Promise<ApiError> {
    const body = (await this.readJson(res)) as Partial<ApiErrorBody> | null
    const message = body?.error?.message ?? (res.statusText || `HTTP ${res.status}`)
    return new ApiError(ApiErrorKind.Http, message, res.status, body?.error?.code ?? null)
  }

  private async parse<T>(res: Response): Promise<T> {
    if (res.status === ApiConfig.HTTP_NO_CONTENT) return null as T
    const text = await res.text()
    if (!text) return null as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new ApiError(ApiErrorKind.Parse, 'Invalid JSON in response', res.status)
    }
  }

  private async readJson(res: Response): Promise<unknown> {
    try {
      return JSON.parse(await res.text())
    } catch {
      return null
    }
  }
}
