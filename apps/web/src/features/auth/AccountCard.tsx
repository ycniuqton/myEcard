import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Surface } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Gap, Size } from '../../design/scale'
import { useAuth } from '../../auth/AuthProvider'
import { AuthCopy } from './AuthCopy'
import { AuthTestId } from './AuthTestId'

const LABEL: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)' }
const EMAIL: CSSProperties = { font: Typo.sans(FontWeight.Medium, FontSize.F16), overflowWrap: 'anywhere' }
const LOGOUT: CSSProperties = {
  height: Size.S56, width: '100%', display: 'flex', alignItems: 'center', textAlign: 'left',
  font: Typo.sans(FontWeight.Regular, FontSize.F16), color: 'var(--again)', borderTop: '1px solid var(--border)',
}

/** Settings section: who is signed in and the Log out button; absent when auth is off. */
export function AccountCard() {
  const { state, account } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!account || !state.session) return null
  const logout = async () => {
    setBusy(true)
    try {
      await account.logout()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Surface padding="14px 16px 0" gap={Gap.G4} data-testid={AuthTestId.AccountCard}>
      <span style={LABEL}>{AuthCopy.SIGNED_IN_AS}</span>
      <span style={{ ...EMAIL, paddingBottom: Gap.G12 }} data-testid={AuthTestId.AccountEmail}>{state.session.email}</span>
      <button type="button" style={LOGOUT} disabled={busy} data-testid={AuthTestId.Logout} onClick={() => void logout()}>
        {busy ? AuthCopy.LOGGING_OUT : AuthCopy.LOGOUT}
      </button>
    </Surface>
  )
}
