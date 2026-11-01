import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Credit } from '@wordmap/shared'
import { ApiClient } from '../../api'
import { Surface, TopBar } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { RoutePath } from '../../app/routes'
import { SettingsTestId } from '../settings/SettingsTestId'
import { FontSize, FontWeight, Gap, Inset, Layer, Leading } from '../../design/scale'
import { Motion } from '../../design/styleValues'
import { CreditsCopy } from './CreditsCopy'

enum LoadState {
  Loading = 'loading',
  Ready = 'ready',
  Failed = 'failed',
}

const SCREEN: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: Layer.L4,
  animation: Motion.A_wmIn_220ms_ease_out,
}

const BODY: CSSProperties = { flex: 1, overflowY: 'auto', padding: Inset.I8_20_20, display: 'flex', flexDirection: 'column', gap: Gap.G16 }
const MUTED: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14, Leading.L20), color: 'var(--muted)' }

function useCredits() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [state, setState] = useState<LoadState>(LoadState.Loading)
  useEffect(() => {
    let live = true
    new ApiClient()
      .credits()
      .then(list => {
        if (!live) return
        setCredits(list)
        setState(LoadState.Ready)
      })
      .catch(() => live && setState(LoadState.Failed))
    return () => {
      live = false
    }
  }, [])
  return { credits, state }
}

function CreditRow({ credit, index, last }: { credit: Credit; index: number; last: boolean }) {
  const row: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: Gap.G4,
    padding: Inset.I14_0,
    borderBottom: last ? undefined : '1px solid var(--border)',
  }
  return (
    <div style={row} data-testid={SettingsTestId.credit(index)}>
      <a href={credit.url} target="_blank" rel="noreferrer noopener" style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F16), color: 'var(--brand)', textDecoration: 'none', display: 'block', padding: Inset.I12_0, margin: Inset.In12_0 }}>
        {credit.name}
      </a>
      <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F13), color: 'var(--muted)' }}>{credit.license}</span>
      {credit.note ? <span style={MUTED}>{credit.note}</span> : null}
    </div>
  )
}

function CreditList({ credits, state }: { credits: Credit[]; state: LoadState }) {
  if (state === LoadState.Loading) return <span style={MUTED}>{CreditsCopy.LOADING}</span>
  if (state === LoadState.Failed) return <span style={{ ...MUTED, color: 'var(--again)' }}>{CreditsCopy.FAILED}</span>
  if (credits.length === 0) return <span style={MUTED}>{CreditsCopy.EMPTY}</span>
  return (
    <Surface padding="0 16px" data-testid={SettingsTestId.CreditsList}>
      {credits.map((c, i) => (
        <CreditRow key={c.name} credit={c} index={i} last={i === credits.length - 1} />
      ))}
    </Surface>
  )
}

/** About screen listing every data source and its licence, loaded from the API. */
export function CreditsScreen() {
  const navigate = useNavigate()
  const { credits, state } = useCredits()
  return (
    <div style={SCREEN} className="wm-anim" data-testid={SettingsTestId.CreditsScreen}>
      <TopBar backLabel={CreditsCopy.BACK} backTestId={SettingsTestId.CreditsBack} onBack={() => navigate(RoutePath.Settings)} />
      <div style={BODY}>
        <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }}>{CreditsCopy.TITLE}</span>
        <span style={MUTED}>{CreditsCopy.INTRO}</span>
        <CreditList credits={credits} state={state} />
      </div>
    </div>
  )
}
