export enum AuthMode {
  None = 'none',
  Fake = 'fake',
  Supabase = 'supabase',
}

export enum AuthStatus {
  Loading = 'loading',
  SignedOut = 'signedOut',
  SignedIn = 'signedIn',
  Recovery = 'recovery',
}

export enum AuthEventKind {
  SignedIn = 'signedIn',
  SignedOut = 'signedOut',
  TokenRefreshed = 'tokenRefreshed',
  PasswordRecovery = 'passwordRecovery',
}

export enum AuthErrorCode {
  InvalidCredentials = 'invalidCredentials',
  EmailTaken = 'emailTaken',
  EmailNotConfirmed = 'emailNotConfirmed',
  WeakPassword = 'weakPassword',
  InvalidEmail = 'invalidEmail',
  RateLimited = 'rateLimited',
  NoSession = 'noSession',
  Network = 'network',
  NotConfigured = 'notConfigured',
  Unknown = 'unknown',
}

export type AuthSession = {
  userId: string
  email: string
  accessToken: string
}

export type AuthEvent = { kind: AuthEventKind; session: AuthSession | null }
export type AuthListener = (event: AuthEvent) => void
export type SignUpResult = { session: AuthSession | null; needsConfirmation: boolean }
export type AuthState = { status: AuthStatus; session: AuthSession | null }

/** Failure raised by any AuthService; the code maps to friendly copy. */
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, message: string = code) {
    super(message)
    this.name = 'AuthError'
  }
}

/** Email and password accounts behind one contract so tests and e2e inject a fake. */
export interface AuthService {
  signUp(email: string, password: string): Promise<SignUpResult>
  signIn(email: string, password: string): Promise<AuthSession>
  signOut(): Promise<void>
  sendResetEmail(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  currentSession(): Promise<AuthSession | null>
  onChange(listener: AuthListener): () => void
  refresh(): Promise<AuthSession | null>
}
