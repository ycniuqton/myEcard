import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Status } from '@wordmap/shared'
import { RoutePath } from '../../app/routes'
import { FilterChip, ProgressBar, StatusChip } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { BandFilter, selectBandRows, useAppStore } from '../../store'
import type { BandRow } from '../../store'
import { BackLink } from '../common/BackLink'
import { BackNavigation, NavOrigin, useBack } from '../common/NavOrigin'
import { NumberFormat } from '../common/NumberFormat'
import { StatusMap } from '../common/StatusMap'
import { FontSize, FontWeight, Gap, Inset, Leading, Size } from '../../design/scale'
import { Border, Grid, Motion } from '../../design/styleValues'
import { BandCopy } from './BandCopy'

const FILTERS: readonly BandFilter[] = [BandFilter.All, BandFilter.Unknown, BandFilter.Learning, BandFilter.Known]

const HEADER: CSSProperties = {
  flex: 'none',
  padding: Inset.I0_20_12,
  display: 'flex',
  flexDirection: 'column',
  gap: Gap.G12,
  borderBottom: Border.B_1px_solid_border,
}

function RowItem({ row, onOpen }: { row: BandRow; onOpen: (rank: number) => void }) {
  const style: CSSProperties = {
    minHeight: Size.S60,
    display: 'grid',
    gridTemplateColumns: Grid.C_48px_1fr_auto,
    alignItems: 'center',
    gap: Gap.G8,
    borderBottom: Border.B_1px_solid_border,
    cursor: 'pointer',
    padding: Inset.I8_0,
    textAlign: 'left',
    width: '100%',
  }
  const short: CSSProperties = {
    font: Typo.sans(FontWeight.Regular, FontSize.F13, Leading.L18),
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  return (
    <button type="button" style={style} data-testid={`row-${row.rank}`} onClick={() => onOpen(row.rank)}>
      <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F13), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
        {NumberFormat.int(row.rank)}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ font: Typo.serif(FontWeight.Semibold, FontSize.F17) }}>{row.lemma}</span>
        <span style={short}>{row.short}</span>
      </div>
      <StatusChip status={StatusMap.toLearn(row.status)} />
    </button>
  )
}

type BandBodyProps = { band: number; filter: BandFilter; onFilter: (f: BandFilter) => void }

function BandHeader({ band, filter, onFilter, back }: BandBodyProps & { back: () => void }) {
  const summary = useAppStore((s) => s.progress.bands.find((b) => b.band === band) ?? null)
  if (!summary) return null
  const c = summary.counts
  const title: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }
  return (
    <div style={HEADER}>
      <BackLink label={BackNavigation.label(NavOrigin.Map)} onBack={back} />
      <div style={title}>
        <span style={{ font: Typo.serif(FontWeight.Semibold, FontSize.F26, Leading.L32) }} data-testid="band-title">
          Words {NumberFormat.range(summary.start, summary.end)}
        </span>
        <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F14), color: 'var(--muted)' }} data-testid="band-percent">
          {summary.percent}
          {BandCopy.KNOWN_SUFFIX}
        </span>
      </div>
      <ProgressBar
        mastered={c[Status.Mastered]}
        known={c[Status.Known]}
        learning={c[Status.Learning]}
        total={summary.size}
        height={8}
      />
      <div style={{ display: 'flex', gap: Gap.G8 }}>
        {FILTERS.map((f) => (
          <FilterChip key={f} label={f} active={f === filter} onClick={() => onFilter(f)} testId={`filter-${f.toLowerCase()}`} />
        ))}
      </div>
    </div>
  )
}

function BandRows({ band, filter }: Pick<BandBodyProps, 'band' | 'filter'>) {
  const navigate = useNavigate()
  const progress = useAppStore((s) => s.progress)
  const index = useAppStore((s) => s.index)
  const rows = useMemo(() => selectBandRows(useAppStore.getState(), band, filter), [progress, index, band, filter])
  const open = (rank: number) =>
    navigate(RoutePath.Word.replace(':rank', String(rank)), { state: BackNavigation.state(NavOrigin.Band) })
  const list = useMemo(() => rows.map((r) => <RowItem key={r.rank} row={r} onOpen={open} />), [rows])
  const empty: CSSProperties = { padding: Inset.I56_0, textAlign: 'center', font: Typo.sans(FontWeight.Regular, FontSize.F16), color: 'var(--muted)' }
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: Inset.I0_20 }} data-testid="band-rows">
      {list}
      {rows.length === 0 ? <div style={empty}>{BandCopy.EMPTY}</div> : null}
    </div>
  )
}

/** Band detail: status bar, filter chips and the word rows of one 100-word band. */
export function BandScreen() {
  const { index } = useParams()
  const band = Number(index)
  const [filter, setFilter] = useState<BandFilter>(BandFilter.All)
  const { back } = useBack(RoutePath.Map)
  return (
    <div
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', animation: Motion.A_wmIn_220ms_ease_out }}
      data-testid="band-screen"
    >
      <BandHeader band={band} filter={filter} onFilter={setFilter} back={back} />
      <BandRows band={band} filter={filter} />
    </div>
  )
}
