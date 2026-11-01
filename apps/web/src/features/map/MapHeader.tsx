import type { CSSProperties } from 'react'
import { Status } from '@wordmap/shared'
import { Icon, IconName, LegendSwatch, Segmented } from '../../design/primitives'
import { LearnStatus, StatusPalette } from '../../design/status'
import { Typo } from '../../design/typography'
import { NumberFormat } from '../common/NumberFormat'
import { MapMode, MapCopy } from './MapMode'
import { FontSize, FontWeight, Gap, Inset, Leading, Size } from '../../design/scale'
import { Border, IconSize } from '../../design/styleValues'

export type MapHeaderProps = {
  mode: MapMode
  onMode: (mode: MapMode) => void
  total: number
  known: number
  percent: number
  counts: Record<Status, number>
}

const MODE_OPTIONS = [
  { value: MapMode.Compact, label: MapCopy.COMPACT },
  { value: MapMode.Bands, label: MapCopy.BANDS },
]

const LEGEND: ReadonlyArray<readonly [LearnStatus, Status, string]> = [
  [LearnStatus.Mastered, Status.Mastered, StatusPalette.label(LearnStatus.Mastered)],
  [LearnStatus.Known, Status.Known, StatusPalette.label(LearnStatus.Known)],
  [LearnStatus.Learning, Status.Learning, StatusPalette.label(LearnStatus.Learning)],
  [LearnStatus.Unknown, Status.Unknown, StatusPalette.label(LearnStatus.Unknown)],
]

const WRAP: CSSProperties = {
  flex: 'none',
  padding: Inset.I8_20_14,
  display: 'flex',
  flexDirection: 'column',
  gap: Gap.G12,
  borderBottom: Border.B_1px_solid_border,
}

function ListTitle({ total }: { total: number }) {
  const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: Gap.G4, height: Size.S32, font: Typo.sans(FontWeight.Semibold, FontSize.F15) }
  return (
    <div style={row}>
      {MapCopy.LIST_NAME}
      <Icon name={IconName.ChevronDown} size={IconSize.S16} />
      <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)', marginLeft: Size.S4 }}>
        {NumberFormat.int(total)} words
      </span>
    </div>
  )
}

function Headline({ known, percent }: Pick<MapHeaderProps, 'known' | 'percent'>) {
  const big = { font: Typo.serif(FontWeight.Semibold, FontSize.F30, Leading.L36), fontVariantNumeric: 'tabular-nums' }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: Gap.G8 }}>
      <span style={big} data-testid="map-known">
        {NumberFormat.int(known)} known
      </span>
      <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F17), color: 'var(--muted)' }} data-testid="map-percent">
        {percent}%
      </span>
    </div>
  )
}

function Legend({ counts }: Pick<MapHeaderProps, 'counts'>) {
  const row: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px 14px',
    font: Typo.sans(FontWeight.Regular, FontSize.F13),
    color: 'var(--muted)',
    fontVariantNumeric: 'tabular-nums',
  }
  return (
    <div style={row} data-testid="map-legend">
      {LEGEND.map(([paint, status, label]) => (
        <span key={status} style={{ display: 'flex', alignItems: 'center', gap: Gap.G6 }}>
          <LegendSwatch status={paint} />
          {label} {NumberFormat.int(counts[status])}
        </span>
      ))}
    </div>
  )
}

/** Map top block: list name, mode switch, known headline and status legend. */
export function MapHeader({ mode, onMode, total, known, percent, counts }: MapHeaderProps) {
  return (
    <div style={WRAP}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ListTitle total={total} />
        <Segmented
          options={MODE_OPTIONS}
          value={mode}
          onChange={onMode}
          itemPadding="5px 10px"
          label={MapCopy.MODE_LABEL}
          itemTestId={(v) => `map-mode-${v}`}
        />
      </div>
      <Headline known={known} percent={percent} />
      <Legend counts={counts} />
    </div>
  )
}
