import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ButtonVariant, PrimaryButton, Surface } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Gap, Inset, Layer, Leading } from '../../design/scale'
import { AuthConfig } from '../../auth/AuthConfig'
import { useAuth } from '../../auth/AuthProvider'
import { LegacyMigration } from '../../auth/LegacyMigration'
import { useAppStore } from '../../store'
import { AuthCopy } from './AuthCopy'
import { AuthTestId } from './AuthTestId'

const CARD_MAX_WIDTH = 360
const OVERLAY: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: Layer.L5, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: Inset.I0_20, background: 'color-mix(in srgb, var(--text) 40%, transparent)',
}
const CARD: CSSProperties = { maxWidth: CARD_MAX_WIDTH, width: '100%' }
const TITLE: CSSProperties = { margin: 0, font: Typo.serif(FontWeight.Semibold, FontSize.F22, Leading.L28) }
const BODY: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F15, Leading.L22), color: 'var(--muted)' }
const ERROR: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--again)' }

function useOffer(migration: LegacyMigration, userId: string | undefined): boolean {
  const accountEmpty = useAppStore(s => s.sync.lastSyncAt !== null && s.userWords.size === 0 && !s.settings.placementDone)
  const [offer, setOffer] = useState(false)
  useEffect(() => {
    let alive = true
    setOffer(false)
    if (!userId || !accountEmpty) return undefined
    void migration.shouldOffer(userId, false).then(yes => alive && setOffer(yes))
    return () => {
      alive = false
    }
  }, [migration, userId, accountEmpty])
  return offer
}

/** One-time "Upload your progress from this device?" prompt; nothing is uploaded without the Upload tap. */
export function LegacyPrompt() {
  const { state } = useAuth()
  const userId = state.session?.userId
  const migration = useMemo(() => new LegacyMigration({ storage: window.localStorage }), [])
  const offer = useOffer(migration, userId)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hidden, setHidden] = useState(false)
  if (!AuthConfig.usesAuth() || !userId || !offer || hidden) return null
  const later = () => {
    migration.dismiss(userId)
    setHidden(true)
  }
  const upload = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await migration.upload(userId, snapshot => useAppStore.getState().importData(snapshot))
      setHidden(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={OVERLAY} role="dialog" aria-modal="true" aria-labelledby="legacy-title" data-testid={AuthTestId.LegacyPrompt}>
      <Surface gap={Gap.G12} padding="20px" style={CARD}>
        <h2 id="legacy-title" style={TITLE}>{AuthCopy.LEGACY_TITLE}</h2>
        <span style={BODY}>{AuthCopy.LEGACY_BODY}</span>
        {failed ? <span role="alert" data-testid={AuthTestId.LegacyError} style={ERROR}>{AuthCopy.LEGACY_FAILED}</span> : null}
        <PrimaryButton disabled={busy} data-testid={AuthTestId.LegacyUpload} onClick={() => void upload()}>{AuthCopy.LEGACY_UPLOAD}</PrimaryButton>
        <PrimaryButton variant={ButtonVariant.Outline} disabled={busy} data-testid={AuthTestId.LegacyLater} onClick={later}>{AuthCopy.LEGACY_LATER}</PrimaryButton>
      </Surface>
    </div>
  )
}
