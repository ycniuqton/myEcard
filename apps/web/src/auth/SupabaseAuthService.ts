import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { AuthConfig } from './AuthConfig'
import {
  AuthError, AuthErrorCode, AuthEventKind, type AuthListener, type AuthService, type AuthSession, type SignUpResult,
} from './AuthTypes'

type SupabaseFailure = { code?: string; message?: string; name?: string; status?: number } | null

/** Translates supabase-js failures into AuthErrorCode values. */
export class SupabaseErrorMapper {
  private static readonly CODES: Record<string, AuthErrorCode> = {
    invalid_credentials: AuthErrorCode.InvalidCredentials,
    user_already_exists: AuthErrorCode.EmailTaken,
    email_exists: AuthErrorCode.EmailTaken,
    email_not_confirmed: AuthErrorCode.EmailNotConfirmed,
    weak_password: AuthErrorCode.WeakPassword,
    validation_failed: AuthErrorCode.InvalidEmail,
    over_request_rate_limit: AuthErrorCode.RateLimited,
    over_email_send_rate_limit: AuthErrorCode.RateLimited,
    session_not_found: AuthErrorCode.NoSession,
    session_expired: AuthErrorCode.NoSession,
  }

  private static readonly NETWORK_NAMES = ['AuthRetryableFetchError', 'AuthUnknownError']

  static map(failure: SupabaseFailure): AuthError {
    const code = (failure?.code && SupabaseErrorMapper.CODES[failure.code]) || SupabaseErrorMapper.fallback(failure)
    return new AuthError(code, failure?.message ?? code)
  }

  private static fallback(failure: SupabaseFailure): AuthErrorCode {
    if (failure?.name && SupabaseErrorMapper.NETWORK_NAMES.includes(failure.name)) return AuthErrorCode.Network
    return AuthErrorCode.Unknown
  }
}

class SessionMapper {
  private static readonly EVENTS: Partial<Record<AuthChangeEvent, AuthEventKind>> = {
    SIGNED_IN: AuthEventKind.SignedIn,
    SIGNED_OUT: AuthEventKind.SignedOut,
    TOKEN_REFRESHED: AuthEventKind.TokenRefreshed,
    USER_UPDATED: AuthEventKind.TokenRefreshed,
    PASSWORD_RECOVERY: AuthEventKind.PasswordRecovery,
  }

  static session(raw: Session | null): AuthSession | null {
    if (!raw) return null
    return { userId: raw.user.id, email: raw.user.email ?? '', accessToken: raw.access_token }
  }

  static event(event: AuthChangeEvent): AuthEventKind | null {
    return SessionMapper.EVENTS[event] ?? null
  }
}

/** Supabase email and password accounts: persisted session, auto refresh, recovery link detection. */
export class SupabaseAuthService implements AuthService {
  private client: SupabaseClient | null = null

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.auth().signUp({ email, password, options: { emailRedirectTo: this.origin() } })
    if (error) throw SupabaseErrorMapper.map(error)
    const session = SessionMapper.session(data.session)
    return { session, needsConfirmation: session === null }
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.auth().signInWithPassword({ email, password })
    const session = SessionMapper.session(data.session)
    if (error || !session) throw SupabaseErrorMapper.map(error)
    return session
  }

  async signOut(): Promise<void> {
    const { error } = await this.auth().signOut({ scope: 'local' })
    if (error) throw SupabaseErrorMapper.map(error)
  }

  async sendResetEmail(email: string): Promise<void> {
    const { error } = await this.auth().resetPasswordForEmail(email, { redirectTo: `${this.origin()}/reset` })
    if (error) throw SupabaseErrorMapper.map(error)
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.auth().updateUser({ password })
    if (error) throw SupabaseErrorMapper.map(error)
  }

  async currentSession(): Promise<AuthSession | null> {
    const { data } = await this.auth().getSession()
    return SessionMapper.session(data.session)
  }

  onChange(listener: AuthListener): () => void {
    const { data } = this.auth().onAuthStateChange((event, session) => {
      const kind = SessionMapper.event(event)
      if (kind) listener({ kind, session: SessionMapper.session(session) })
    })
    return () => data.subscription.unsubscribe()
  }

  async refresh(): Promise<AuthSession | null> {
    const { data, error } = await this.auth().refreshSession()
    return error ? null : SessionMapper.session(data.session)
  }

  private auth() {
    return this.supabase().auth
  }

  private supabase(): SupabaseClient {
    if (this.client) return this.client
    const url = AuthConfig.supabaseUrl()
    const key = AuthConfig.supabaseKey()
    if (!url || !key) throw new AuthError(AuthErrorCode.NotConfigured)
    this.client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
    return this.client
  }

  private origin(): string {
    return window.location.origin
  }
}
