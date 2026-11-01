import { RoutePath } from '../app/routes'
import { AuthStatus } from './AuthTypes'

export enum GateAction {
  Wait = 'wait',
  Allow = 'allow',
  Redirect = 'redirect',
}

export type GateDecision = { action: GateAction; to?: string }

/** Decides what the route gate does for an auth status and pathname. */
export class AuthGatePolicy {
  private static readonly SIGNED_OUT_PATHS: readonly string[] = [RoutePath.Login, RoutePath.SignUp, RoutePath.Forgot]
  private static readonly AUTH_PATHS: readonly string[] = [...AuthGatePolicy.SIGNED_OUT_PATHS, RoutePath.Reset]

  static decide(status: AuthStatus, pathname: string): GateDecision {
    if (status === AuthStatus.Loading) return { action: GateAction.Wait }
    if (status === AuthStatus.Recovery) return AuthGatePolicy.only(pathname, [RoutePath.Reset], RoutePath.Reset)
    if (status === AuthStatus.SignedOut) return AuthGatePolicy.only(pathname, AuthGatePolicy.SIGNED_OUT_PATHS, RoutePath.Login)
    return AuthGatePolicy.AUTH_PATHS.includes(pathname) ? AuthGatePolicy.go(RoutePath.Today) : { action: GateAction.Allow }
  }

  static showsAuthScreens(status: AuthStatus): boolean {
    return status === AuthStatus.SignedOut || status === AuthStatus.Recovery
  }

  private static only(pathname: string, allowed: readonly string[], fallback: RoutePath): GateDecision {
    return allowed.includes(pathname) ? { action: GateAction.Allow } : AuthGatePolicy.go(fallback)
  }

  private static go(to: RoutePath): GateDecision {
    return { action: GateAction.Redirect, to }
  }
}
