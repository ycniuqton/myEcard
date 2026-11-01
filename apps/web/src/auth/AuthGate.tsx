import type { CSSProperties, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Typo } from '../design/typography'
import { FontSize, FontWeight } from '../design/scale'
import { AuthRoutes } from '../features/auth/AuthRoutes'
import { AuthCopy } from '../features/auth/AuthCopy'
import { AuthTestId } from '../features/auth/AuthTestId'
import { LegacyPrompt } from '../features/auth/LegacyPrompt'
import { AuthGatePolicy, GateAction } from './AuthGatePolicy'
import { useAuth } from './AuthProvider'

const SPLASH: CSSProperties = {
  height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)',
  font: Typo.sans(FontWeight.Medium, FontSize.F15),
}

function Splash() {
  return <div style={SPLASH} data-testid={AuthTestId.Loading} role="status">{AuthCopy.LOADING}</div>
}

/** No session sends the user to /login; the app only renders once its per-user database is open. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state, bound } = useAuth()
  const { pathname } = useLocation()
  const decision = AuthGatePolicy.decide(state.status, pathname)
  if (decision.action === GateAction.Wait) return <Splash />
  if (decision.action === GateAction.Redirect) return <Navigate to={decision.to as string} replace />
  if (AuthGatePolicy.showsAuthScreens(state.status)) return <AuthRoutes />
  if (!bound) return <Splash />
  return (
    <>
      {children}
      <LegacyPrompt />
    </>
  )
}
