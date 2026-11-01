import type { AuthTokenProvider } from '../api/AuthTokenProvider'
import {
  AuthEventKind, AuthStatus, type AuthEvent, type AuthService, type AuthSession, type AuthState, type SignUpResult,
} from './AuthTypes'

export type AuthStateListener = (state: AuthState) => void
export type AuthManagerOptions = { recoveryHint?: boolean }

/** Owns the auth state machine over an AuthService and serves tokens to ApiClient. */
export class AuthManager implements AuthTokenProvider {
  private state: AuthState = { status: AuthStatus.Loading, session: null }
  private readonly listeners = new Set<AuthStateListener>()
  private refreshing: Promise<boolean> | null = null
  private starting: Promise<void> | null = null
  private unlisten: (() => void) | null = null

  constructor(private readonly service: AuthService, private readonly options: AuthManagerOptions = {}) {}

  snapshot = (): AuthState => this.state

  subscribe = (listener: AuthStateListener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): Promise<void> {
    this.starting ??= this.load()
    return this.starting
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    return this.service.signUp(email, password)
  }

  async signIn(email: string, password: string): Promise<void> {
    this.adopt(await this.service.signIn(email, password), AuthStatus.SignedIn)
  }

  async signOut(): Promise<void> {
    this.set({ status: AuthStatus.SignedOut, session: null })
    await this.service.signOut().catch(() => undefined)
  }

  sendResetEmail = (email: string) => this.service.sendResetEmail(email)

  async updatePassword(password: string): Promise<void> {
    await this.service.updatePassword(password)
    if (this.state.session) this.set({ status: AuthStatus.SignedIn, session: this.state.session })
  }

  async accessToken(): Promise<string | null> {
    return this.state.session?.accessToken ?? null
  }

  refresh(): Promise<boolean> {
    this.refreshing ??= this.renew().finally(() => {
      this.refreshing = null
    })
    return this.refreshing
  }

  onUnauthenticated(): void {
    void this.signOut()
  }

  dispose(): void {
    this.unlisten?.()
    this.unlisten = null
  }

  private async load(): Promise<void> {
    this.unlisten = this.service.onChange(event => this.handle(event))
    const session = await this.service.currentSession()
    if (this.state.status !== AuthStatus.Loading) return
    const recovery = this.options.recoveryHint === true
    this.set(session
      ? { status: recovery ? AuthStatus.Recovery : AuthStatus.SignedIn, session }
      : { status: AuthStatus.SignedOut, session: null })
  }

  private async renew(): Promise<boolean> {
    try {
      const session = await this.service.refresh()
      if (session) this.adopt(session, this.state.status === AuthStatus.Recovery ? AuthStatus.Recovery : AuthStatus.SignedIn)
      return session !== null
    } catch {
      return false
    }
  }

  private adopt(session: AuthSession, status: AuthStatus): void {
    this.set({ status, session })
  }

  private handle(event: AuthEvent): void {
    if (event.kind === AuthEventKind.SignedOut) this.set({ status: AuthStatus.SignedOut, session: null })
    else if (event.kind === AuthEventKind.PasswordRecovery && event.session) this.adopt(event.session, AuthStatus.Recovery)
    else if (event.session) this.followSession(event)
  }

  private followSession(event: AuthEvent): void {
    const session = event.session as AuthSession
    const refreshOnly = event.kind === AuthEventKind.TokenRefreshed
    if (refreshOnly && !this.state.session) return
    if (this.state.status === AuthStatus.Recovery) this.set({ status: AuthStatus.Recovery, session })
    else this.set({ status: AuthStatus.SignedIn, session })
  }

  private set(next: AuthState): void {
    this.state = next
    this.listeners.forEach(l => l(next))
  }
}
