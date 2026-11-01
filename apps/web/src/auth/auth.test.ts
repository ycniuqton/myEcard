import { describe, expect, it } from 'vitest'
import { RoutePath } from '../app/routes'
import { AuthGatePolicy, GateAction } from './AuthGatePolicy'
import { AuthManager } from './AuthManager'
import { AuthRules, FieldProblem } from './AuthRules'
import { AuthConfig } from './AuthConfig'
import { AuthError, AuthErrorCode, AuthMode, AuthStatus } from './AuthTypes'
import { FakeAuthService, FakeToken } from './FakeAuthService'

const EMAIL = 'ann@example.com'
const PASSWORD = 'correct horse'

function counterIds(): () => string {
  let n = 0
  return () => `user-${++n}`
}

function fake(requireConfirmation = false): FakeAuthService {
  return new FakeAuthService({ requireConfirmation, newId: counterIds() })
}

async function failure(task: Promise<unknown>): Promise<AuthError> {
  try {
    await task
  } catch (error) {
    return error as AuthError
  }
  throw new Error('expected failure')
}

describe('FakeAuthService', () => {
  it('signs up, issues a token carrying the user id and persists the session', async () => {
    const auth = fake()
    const result = await auth.signUp(EMAIL, PASSWORD)
    expect(result.needsConfirmation).toBe(false)
    expect(FakeToken.userId(result.session?.accessToken)).toBe('user-1')
    expect((await auth.currentSession())?.email).toBe(EMAIL)
  })

  it('rejects duplicate email, weak password and wrong credentials with codes', async () => {
    const auth = fake()
    await auth.signUp(EMAIL, PASSWORD)
    expect((await failure(auth.signUp(EMAIL.toUpperCase(), PASSWORD))).code).toBe(AuthErrorCode.EmailTaken)
    expect((await failure(auth.signUp('b@example.com', 'short'))).code).toBe(AuthErrorCode.WeakPassword)
    expect((await failure(auth.signIn(EMAIL, 'nope-nope'))).code).toBe(AuthErrorCode.InvalidCredentials)
    expect((await failure(auth.signIn('ghost@example.com', PASSWORD))).code).toBe(AuthErrorCode.InvalidCredentials)
  })

  it('requires confirmation when configured and signs in after confirm', async () => {
    const auth = fake(true)
    const result = await auth.signUp(EMAIL, PASSWORD)
    expect(result).toEqual({ session: null, needsConfirmation: true })
    expect((await failure(auth.signIn(EMAIL, PASSWORD))).code).toBe(AuthErrorCode.EmailNotConfirmed)
    auth.confirm(EMAIL)
    expect((await auth.signIn(EMAIL, PASSWORD)).userId).toBe('user-1')
  })

  it('signs out, refreshes with a new token and emits events', async () => {
    const auth = fake()
    const kinds: string[] = []
    auth.onChange(e => kinds.push(e.kind))
    const first = (await auth.signUp(EMAIL, PASSWORD)).session
    const second = await auth.refresh()
    expect(second?.accessToken).not.toBe(first?.accessToken)
    await auth.signOut()
    expect(await auth.currentSession()).toBeNull()
    expect(await auth.refresh()).toBeNull()
    expect(kinds).toEqual(['signedIn', 'tokenRefreshed', 'signedOut'])
  })

  it('records reset emails and updates the password for the recovery session', async () => {
    const auth = fake()
    await auth.signUp(EMAIL, PASSWORD)
    await auth.signOut()
    await auth.sendResetEmail(` ${EMAIL} `)
    expect(auth.sentResets).toEqual([EMAIL])
    auth.simulateRecovery(EMAIL)
    await auth.updatePassword('brand new pass')
    await auth.signOut()
    expect((await auth.signIn(EMAIL, 'brand new pass')).email).toBe(EMAIL)
  })

  it('invalidateTokens makes old tokens invalid until refreshed', async () => {
    const auth = fake()
    const old = (await auth.signUp(EMAIL, PASSWORD)).session?.accessToken ?? ''
    auth.invalidateTokens()
    expect(auth.isTokenValid(old)).toBe(false)
    expect(auth.isTokenValid((await auth.refresh())?.accessToken ?? null)).toBe(true)
  })
})

describe('AuthManager', () => {
  it('starts signed out, then follows sign up and sign out', async () => {
    const manager = new AuthManager(fake())
    expect(manager.snapshot().status).toBe(AuthStatus.Loading)
    await manager.start()
    expect(manager.snapshot().status).toBe(AuthStatus.SignedOut)
    await manager.signUp(EMAIL, PASSWORD)
    expect(manager.snapshot().status).toBe(AuthStatus.SignedIn)
    expect(await manager.accessToken()).toContain('user-1')
    await manager.signOut()
    expect(manager.snapshot()).toEqual({ status: AuthStatus.SignedOut, session: null })
    expect(await manager.accessToken()).toBeNull()
  })

  it('restores a stored session and enters recovery for a recovery event', async () => {
    const service = fake()
    await service.signUp(EMAIL, PASSWORD)
    const manager = new AuthManager(service)
    await manager.start()
    expect(manager.snapshot().status).toBe(AuthStatus.SignedIn)
    service.simulateRecovery(EMAIL)
    expect(manager.snapshot().status).toBe(AuthStatus.Recovery)
    await manager.updatePassword('another pass 1')
    expect(manager.snapshot().status).toBe(AuthStatus.SignedIn)
  })

  it('refresh shares one in-flight call and reports false without a session', async () => {
    const service = fake()
    const manager = new AuthManager(service)
    await manager.start()
    expect(await manager.refresh()).toBe(false)
    await manager.signUp(EMAIL, PASSWORD)
    const [a, b] = await Promise.all([manager.refresh(), manager.refresh()])
    expect([a, b]).toEqual([true, true])
  })

  it('onUnauthenticated signs the user out', async () => {
    const manager = new AuthManager(fake())
    await manager.start()
    await manager.signUp(EMAIL, PASSWORD)
    manager.onUnauthenticated()
    expect(manager.snapshot().status).toBe(AuthStatus.SignedOut)
  })
})

describe('AuthGatePolicy', () => {
  it('waits while loading', () => {
    expect(AuthGatePolicy.decide(AuthStatus.Loading, RoutePath.Today).action).toBe(GateAction.Wait)
  })

  it('sends a signed-out visitor to /login but allows the auth screens', () => {
    expect(AuthGatePolicy.decide(AuthStatus.SignedOut, RoutePath.Today)).toEqual({ action: GateAction.Redirect, to: RoutePath.Login })
    expect(AuthGatePolicy.decide(AuthStatus.SignedOut, RoutePath.Settings).to).toBe(RoutePath.Login)
    for (const path of [RoutePath.Login, RoutePath.SignUp, RoutePath.Forgot]) {
      expect(AuthGatePolicy.decide(AuthStatus.SignedOut, path).action).toBe(GateAction.Allow)
    }
    expect(AuthGatePolicy.decide(AuthStatus.SignedOut, RoutePath.Reset).to).toBe(RoutePath.Login)
  })

  it('keeps a recovery session on /reset only', () => {
    expect(AuthGatePolicy.decide(AuthStatus.Recovery, RoutePath.Reset).action).toBe(GateAction.Allow)
    expect(AuthGatePolicy.decide(AuthStatus.Recovery, RoutePath.Today).to).toBe(RoutePath.Reset)
  })

  it('lets a signed-in user into the app and bounces them off the auth screens', () => {
    expect(AuthGatePolicy.decide(AuthStatus.SignedIn, RoutePath.Map).action).toBe(GateAction.Allow)
    expect(AuthGatePolicy.decide(AuthStatus.SignedIn, RoutePath.Login)).toEqual({ action: GateAction.Redirect, to: RoutePath.Today })
  })
})

describe('AuthRules and AuthConfig', () => {
  it('validates email format and password length', () => {
    expect(AuthRules.email('')).toBe(FieldProblem.EmailRequired)
    expect(AuthRules.email('nope')).toBe(FieldProblem.EmailInvalid)
    expect(AuthRules.email(' a@b.co ')).toBeNull()
    expect(AuthRules.password('1234567')).toBe(FieldProblem.PasswordTooShort)
    expect(AuthRules.password('12345678')).toBeNull()
    expect(AuthRules.confirm('a', 'b')).toBe(FieldProblem.PasswordMismatch)
  })

  it('resolves the auth mode, defaulting to supabase', () => {
    expect(AuthConfig.mode('none')).toBe(AuthMode.None)
    expect(AuthConfig.mode('fake')).toBe(AuthMode.Fake)
    expect(AuthConfig.mode('')).toBe(AuthMode.Supabase)
    expect(AuthConfig.mode('bogus')).toBe(AuthMode.Supabase)
    expect(AuthConfig.dbNameFor('u1')).toBe('wordmap-u1')
    expect(AuthConfig.dbNameFor(null)).toBeNull()
  })
})
