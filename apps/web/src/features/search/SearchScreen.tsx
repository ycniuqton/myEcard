import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { SearchHit } from '@wordmap/shared'
import { RoutePath } from '../../app/routes'
import { Icon, IconName, StatusChip } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { useAppStore } from '../../store'
import { BackNavigation, NavOrigin } from '../common/NavOrigin'
import { NumberFormat } from '../common/NumberFormat'
import { StatusMap } from '../common/StatusMap'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, Grid, IconSize, Motion } from '../../design/styleValues'
import { SearchBox } from './SearchBox'
import { SearchCopy } from './SearchCopy'

function useQuery(): [string, (q: string) => void] {
  const [params, setParams] = useSearchParams()
  const query = params.get(SearchCopy.QUERY_PARAM) ?? ''
  const setQuery = (q: string) => setParams(q ? { [SearchCopy.QUERY_PARAM]: q } : {}, { replace: true })
  return [query, setQuery]
}

function RecentList({ items, onPick }: { items: readonly string[]; onPick: (q: string) => void }) {
  if (items.length === 0) return null
  const head: CSSProperties = {
    font: Typo.sans(FontWeight.Semibold, FontSize.F12),
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    padding: Inset.I8_0,
  }
  const row: CSSProperties = {
    height: Size.S48,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: Gap.G12,
    borderBottom: Border.B_1px_solid_border,
    font: Typo.sans(FontWeight.Regular, FontSize.F17),
    textAlign: 'left',
  }
  return (
    <div data-testid="search-recent">
      <div style={head}>{SearchCopy.RECENT}</div>
      {items.map((q) => (
        <button key={q} type="button" style={row} data-testid={`recent-${q}`} onClick={() => onPick(q)}>
          <span style={{ color: 'var(--muted)', display: 'flex' }}><Icon name={IconName.Clock} size={IconSize.S18} /></span>
          {q}
        </button>
      ))}
    </div>
  )
}

function ResultRow({ hit, onOpen }: { hit: SearchHit; onOpen: (hit: SearchHit) => void }) {
  const row: CSSProperties = {
    minHeight: Size.S60,
    width: '100%',
    display: 'grid',
    gridTemplateColumns: Grid.C_52px_1fr_auto,
    alignItems: 'center',
    gap: Gap.G8,
    borderBottom: Border.B_1px_solid_border,
    textAlign: 'left',
  }
  const rank: CSSProperties = { font: Typo.sans(FontWeight.Medium, FontSize.F13), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }
  return (
    <button type="button" style={row} data-testid={`result-${hit.rank}`} onClick={() => onOpen(hit)}>
      <span style={rank}>#{NumberFormat.int(hit.rank)}</span>
      <span style={{ font: Typo.serif(FontWeight.Semibold, FontSize.F18) }}>{hit.lemma}</span>
      <StatusChip status={StatusMap.toLearn(hit.status)} />
    </button>
  )
}

function NoResults() {
  const wrap: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: Gap.G10,
    padding: Inset.I64_20,
    textAlign: 'center',
  }
  return (
    <div style={wrap} data-testid="search-empty">
      <span style={{ color: 'var(--muted)', display: 'flex' }}><Icon name={IconName.Search} size={IconSize.S28} /></span>
      <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F17, Leading.L26) }}>{SearchCopy.NO_RESULTS}</span>
      <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)' }}>{SearchCopy.TRY_AGAIN}</span>
    </div>
  )
}

function useHits(query: string): SearchHit[] {
  const search = useAppStore((s) => s.search)
  const ready = useAppStore((s) => s.ready)
  const userWords = useAppStore((s) => s.userWords)
  return useMemo(() => (query.trim() ? search(query.trim()) : []), [query, search, ready, userWords])
}

/** Word search: autofocused field, recent searches, status-chip results and an empty state. */
export function SearchScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useQuery()
  const recent = useAppStore((s) => s.recentSearches)
  const remember = useAppStore((s) => s.rememberSearch)
  const hits = useHits(query)
  const typed = query.trim().length > 0
  const open = (hit: SearchHit) => {
    void remember(query)
    navigate(RoutePath.Word.replace(':rank', String(hit.rank)), { state: BackNavigation.state(NavOrigin.Search) })
  }
  const head: CSSProperties = { padding: Inset.I8_20_12, display: 'flex', flexDirection: 'column', gap: Gap.G14 }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: Motion.A_wmIn_220ms_ease_out }} data-testid="search-screen">
      <div style={head}>
        <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }}>{SearchCopy.TITLE}</span>
        <SearchBox query={query} onChange={setQuery} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: Inset.I0_20 }}>
        {typed ? null : <RecentList items={recent} onPick={setQuery} />}
        {hits.map((h) => (
          <ResultRow key={h.id} hit={h} onOpen={open} />
        ))}
        {typed && hits.length === 0 ? <NoResults /> : null}
      </div>
    </div>
  )
}
