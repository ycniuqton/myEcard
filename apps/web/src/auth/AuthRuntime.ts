import type { AuthTokenProvider } from '../api/AuthTokenProvider'
import { RoutePath } from '../app/routes'
import { AuthConfig } from './AuthConfig'
import { AuthManager } from './AuthManager'
import { AuthMode, type AuthService } from './AuthTypes'
import { FakeAuthService } from './FakeAuthService'
import { SupabaseAuthService } from './SupabaseAuthService'

type ServiceBuilder = () => AuthService

/** Picks the AuthService implementation for a mode; the table is the only place that names concrete classes. */
export class AuthServiceFactory {
  private static readonly BUILDERS: Partial<Record<AuthMode, ServiceBuilder>> = {
    [AuthMode.Fake]: () => new FakeAuthService({ storage: window.localStorage }),
    [AuthMode.Supabase]: () => new SupabaseAuthService(),
  }

  static create(mode: AuthMode): AuthService | null {
    return AuthServiceFactory.BUILDERS[mode]?.() ?? null
  }
}

/** App-wide auth singleton, built lazily so tests and mode none never construct a provider. */
export class AuthRuntime {
  private static current: AuthManager | null = null

  static manager(): AuthManager | null {
    if (AuthRuntime.current) return AuthRuntime.current
    const service = AuthServiceFactory.create(AuthConfig.mode())
    if (!service) return null
    const recoveryHint = window.location.pathname === RoutePath.Reset
    AuthRuntime.current = new AuthManager(service, { recoveryHint })
    return AuthRuntime.current
  }

  static tokenProvider(): AuthTokenProvider | undefined {
    if (!AuthConfig.usesAuth()) return undefined
    return new LazyTokenProvider()
  }
}

class LazyTokenProvider implements AuthTokenProvider {
  accessToken = async () => (await AuthRuntime.manager()?.accessToken()) ?? null
  refresh = async () => (await AuthRuntime.manager()?.refresh()) ?? false
  onUnauthenticated = () => AuthRuntime.manager()?.onUnauthenticated()
}
