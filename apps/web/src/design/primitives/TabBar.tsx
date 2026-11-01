import type { CSSProperties } from 'react'
import { Typo } from '../typography'
import { Icon, IconName } from './Icon'
import { FontSize, FontWeight, Gap, Inset, Size } from '../scale'
import { Border, IconSize, Motion } from '../styleValues'
import { A11yCopy } from './A11yCopy'

export enum TabId {
  Today = 'today',
  Map = 'map',
  Search = 'search',
  Progress = 'progress',
}

export interface TabSpec {
  id: TabId
  label: string
  icon: IconName
}

export const TABS: readonly TabSpec[] = [
  { id: TabId.Today, label: 'Today', icon: IconName.Today },
  { id: TabId.Map, label: 'Map', icon: IconName.Map },
  { id: TabId.Search, label: 'Search', icon: IconName.Search },
  { id: TabId.Progress, label: 'Progress', icon: IconName.Progress },
]

export interface TabBarProps {
  active?: TabId
  onSelect: (id: TabId) => void
}

/** Bottom navigation: Today, Map, Search, Progress; 84px with brand active tint. */
export function TabBar({ active, onSelect }: TabBarProps) {
  const bar: CSSProperties = {
    flex: 'none',
    boxSizing: 'content-box',
    height: Size.S84,
    borderTop: Border.B_1px_solid_border,
    background: 'var(--surface)',
    display: 'flex',
    padding: Inset.I8_12_0,
  }
  return (
    <nav style={bar} aria-label={A11yCopy.PRIMARY_NAV}>
      {TABS.map((t) => (
        <TabItem key={t.id} tab={t} active={t.id === active} onSelect={onSelect} />
      ))}
    </nav>
  )
}

interface TabItemProps {
  tab: TabSpec
  active: boolean
  onSelect: (id: TabId) => void
}

function TabItem({ tab, active, onSelect }: TabItemProps) {
  const style: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: Gap.G4,
    alignSelf: 'stretch',
    minHeight: Size.S44,
    color: active ? 'var(--brand)' : 'var(--muted)',
    font: Typo.sans(FontWeight.Semibold, FontSize.F11),
    transition: Motion.T_color_200ms,
  }
  return (
    <button type="button" className="wm-motion" style={style} aria-current={active ? 'page' : undefined} onClick={() => onSelect(tab.id)}>
      <Icon name={tab.icon} size={IconSize.S24} />
      {tab.label}
    </button>
  )
}
