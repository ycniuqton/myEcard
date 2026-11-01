import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { TabBar } from '../design/primitives'
import type { TabId } from '../design/primitives'
import { Typo } from '../design/typography'
import { MediaQueries } from '../features/common/MediaQueries'
import { useMediaQuery } from './useMediaQuery'
import { TabPolicy } from './routes'
import { FontSize, FontWeight, Gap, Inset, Radius, Size } from '../design/scale'
import { Border, Motion, Shadow } from '../design/styleValues'

const PHONE_WIDTH = 390
const PHONE_HEIGHT = 844
const STATUS_BAR_HEIGHT = 54
const TABLESS_SPACER = 18

const DESK: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--desk)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: Inset.I32_16,
  boxSizing: 'border-box',
}

const FRAME: CSSProperties = {
  width: PHONE_WIDTH,
  height: PHONE_HEIGHT,
  flex: 'none',
  borderRadius: Radius.R48,
  overflow: 'hidden',
  background: 'var(--bg)',
  color: 'var(--text)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: Shadow.S_0_0_0_10px_frame_0_24px_60px_rgba_0_0_0_22,
  position: 'relative',
  transition: Motion.T_background_200ms_ease_out,
}

const FULL_BLEED: CSSProperties = {
  height: '100dvh',
  width: '100%',
  background: 'var(--bg)',
  color: 'var(--text)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  paddingTop: 'env(safe-area-inset-top)',
  boxSizing: 'border-box',
}

/** Cosmetic status row (clock and battery) shown on the desktop phone frame only. */
function StatusBar() {
  const row: CSSProperties = {
    height: STATUS_BAR_HEIGHT,
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Inset.I0_30_0_42,
    font: Typo.sans(FontWeight.Semibold, FontSize.F16),
    fontFamily: 'system-ui',
  }
  return (
    <div style={row} aria-hidden="true">
      <span>9:41</span>
      <div style={{ display: 'flex', gap: Gap.G6, alignItems: 'center' }}>
        <div style={{ width: Size.S17, height: Size.S11, borderRadius: 2, background: 'var(--text)' }} />
        <div style={{ width: Size.S25, height: Size.S12, borderRadius: Radius.R4, border: Border.B_1_5px_solid_muted }} />
      </div>
    </div>
  )
}

/** Page chrome: phone frame on desktop, full-bleed on phones, tab bar by route policy. */
export function Shell() {
  const phone = useMediaQuery(MediaQueries.PHONE)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lastTab = useRef<TabId | undefined>(undefined)
  const current = TabPolicy.activeTab(pathname)
  if (current) lastTab.current = current
  const showTabs = !TabPolicy.hidesTabs(pathname)

  const body = (
    <>
      {phone ? null : <StatusBar />}
      <main style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      {showTabs ? (
        <div style={phone ? { paddingBottom: 'env(safe-area-inset-bottom)', background: 'var(--surface)' } : undefined}>
          <TabBar active={current ?? lastTab.current} onSelect={(id) => navigate(TabPolicy.pathFor(id))} />
        </div>
      ) : (
        <div style={{ height: phone ? 'env(safe-area-inset-bottom)' : TABLESS_SPACER, flex: 'none' }} />
      )}
    </>
  )

  if (phone) return <div style={FULL_BLEED}>{body}</div>
  return (
    <div style={DESK}>
      <div style={FRAME}>{body}</div>
    </div>
  )
}
