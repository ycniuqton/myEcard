import {
  AuthError, AuthErrorCode, AuthEventKind, type AuthListener, type AuthService, type AuthSession, type SignUpResult,
} from './AuthTypes'
import { AuthRules } from './AuthRules'

export type KeyValueStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export type FakeUser = { id: string; email: string; password: string; confirmed: boolean }
export type FakeAuthOptions = { storage?: KeyValueStorage; requireConfirmation?: boolean; newId?: () => string }

/** Storage keys and token format of the fake provider. */
export class FakeAuthKeys {
  static readonly USERS = 'wordmap.fakeAuth.users'
  static readonly SESSION = 'wordmap.fakeAuth.session'
  static readonly CONFIRM = 'wordmap.fakeAuth.confirm'
  static readonly TOKEN_PREFIX = 'fake'
  static readonly TOKEN_SEPARATOR = '.'
  static readonly TOKEN_PARTS = 3
  static readonly CONFIRM_ON = '1'
}

class MemoryStorage implements KeyValueStorage {
  private readonly map = new Map<string, string>()
  getItem = (key: string) => this.map.get(key) ?? null
  setItem = (key: string, value: string) => void this.map.set(key, value)
  removeItem = (key: string) => void this.map.delete(key)
}

/** Reads the user id and sequence out of a fake access token. */
export class FakeToken {
  static userId(token: string | null | undefined): string | null {
    const parts = (token ?? '').split(FakeAuthKeys.TOKEN_SEPARATOR)
    return parts.length === FakeAuthKeys.TOKEN_PARTS && parts[0] === FakeAuthKeys.TOKEN_PREFIX ? parts[1] : null
  }

  static sequence(token: string | null | undefined): number {
    return Number((token ?? '').split(FakeAuthKeys.TOKEN_SEPARATOR)[2])
  }
}

/**
 * Users in memory or localStorage issuing fake tokens "fake.<userId>.<n>". Selected with VITE_AUTH_MODE=fake;
 * never touches a network. Test hooks: invalidateTokens, simulateRecovery, confirm, isTokenValid, sentResets.
 */
export class FakeAuthService implements AuthService {
  readonly sentResets: string[] = []
  private readonly storage: KeyValueStorage
  private readonly listeners = new Set<AuthListener>()
  private readonly newId: () => string
  private readonly requireConfirmation: boolean
  private tokenSeq = 0
  private validFrom = 0

  constructor(options: FakeAuthOptions = {}) {
    this.storage = options.storage ?? new MemoryStorage()
    this.requireConfirmation = options.requireConfirmation ?? this.storage.getItem(FakeAuthKeys.CONFIRM) === FakeAuthKeys.CONFIRM_ON
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const users = this.users()
    const clean = AuthRules.normalizeEmail(email)
    if (AuthRules.email(clean)) throw new AuthError(AuthErrorCode.InvalidEmail)
    if (users.some(u => u.email === clean)) throw new AuthError(AuthErrorCode.EmailTaken)
    if (AuthRules.password(password)) throw new AuthError(AuthErrorCode.WeakPassword)
    const user: FakeUser = { id: this.newId(), email: clean, password, confirmed: !this.requireConfirmation }
    this.saveUsers([...users, user])
    if (!user.confirmed) return { session: null, needsConfirmation: true }
    return { session: this.open(user, AuthEventKind.SignedIn), needsConfirmation: false }
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const user = this.users().find(u => u.email === AuthRules.normalizeEmail(email))
    if (!user || user.password !== password) throw new AuthError(AuthErrorCode.InvalidCredentials)
    if (!user.confirmed) throw new AuthError(AuthErrorCode.EmailNotConfirmed)
    return this.open(user, AuthEventKind.SignedIn)
  }

  async signOut(): Promise<void> {
    this.storage.removeItem(FakeAuthKeys.SESSION)
    this.emit(AuthEventKind.SignedOut, null)
  }

  async sendResetEmail(email: string): Promise<void> {
    this.sentResets.push(AuthRules.normalizeEmail(email))
  }

  async updatePassword(password: string): Promise<void> {
    const session = await this.currentSession()
    if (!session) throw new AuthError(AuthErrorCode.NoSession)
    if (AuthRules.password(password)) throw new AuthError(AuthErrorCode.WeakPassword)
    this.saveUsers(this.users().map(u => (u.id === session.userId ? { ...u, password } : u)))
  }

  async currentSession(): Promise<AuthSession | null> {
    const raw = this.storage.getItem(FakeAuthKeys.SESSION)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  }

  onChange(listener: AuthListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async refresh(): Promise<AuthSession | null> {
    const current = await this.currentSession()
    const user = this.users().find(u => u.id === current?.userId)
    return user ? this.open(user, AuthEventKind.TokenRefreshed) : null
  }

  invalidateTokens(): void {
    this.validFrom = this.tokenSeq + 1
  }

  confirm(email: string): void {
    const clean = AuthRules.normalizeEmail(email)
    this.saveUsers(this.users().map(u => (u.email === clean ? { ...u, confirmed: true } : u)))
  }

  simulateRecovery(email: string): AuthSession {
    const user = this.users().find(u => u.email === AuthRules.normalizeEmail(email))
    if (!user) throw new AuthError(AuthErrorCode.NoSession)
    return this.open(user, AuthEventKind.PasswordRecovery)
  }

  isTokenValid(token: string | null): boolean {
    return FakeToken.userId(token) !== null && FakeToken.sequence(token) >= this.validFrom
  }

  private open(user: FakeUser, kind: AuthEventKind): AuthSession {
    const seq = ++this.tokenSeq
    const token = [FakeAuthKeys.TOKEN_PREFIX, user.id, seq].join(FakeAuthKeys.TOKEN_SEPARATOR)
    const session: AuthSession = { userId: user.id, email: user.email, accessToken: token }
    this.storage.setItem(FakeAuthKeys.SESSION, JSON.stringify(session))
    this.emit(kind, session)
    return session
  }

  private emit(kind: AuthEventKind, session: AuthSession | null): void {
    this.listeners.forEach(l => l({ kind, session }))
  }

  private users(): FakeUser[] {
    const raw = this.storage.getItem(FakeAuthKeys.USERS)
    return raw ? (JSON.parse(raw) as FakeUser[]) : []
  }

  private saveUsers(users: FakeUser[]): void {
    this.storage.setItem(FakeAuthKeys.USERS, JSON.stringify(users))
  }
}
