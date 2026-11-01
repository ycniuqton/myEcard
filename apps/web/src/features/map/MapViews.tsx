import { forwardRef, memo } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { Surface, TileGrid, TileMetrics } from '../../design/primitives'
import { TileScale } from '../../design/status'
import { Typo } from '../../design/typography'
import { NumberFormat } from '../common/NumberFormat'
import type { BandPaint } from './BandTiles'
import { MapCopy } from './MapMode'
import { BandWindowConfig } from './BandWindow'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Grid } from '../../design/styleValues'

export type BandsViewProps = {
  paints: readonly BandPaint[]
  visible: ReadonlySet<number>
  onOpen: (band: number) => void
}

type BandCardProps = { paint: BandPaint; shown: boolean; onOpen: (band: number) => void }

function Tiles({ paint, scale, shown }: { paint: BandPaint; scale: TileScale; shown: boolean }) {
  if (!shown) return <div style={{ height: TileMetrics.gridHeight(scale) }} />
  return <TileGrid statuses={paint.statuses} scale={scale} hereIndex={paint.hereIndex} popIndexes={paint.pops} rankStart={paint.band.start} />
}

const HERE_ATTR_ON = '1'
const HERE_ATTR_OFF = '0'
const PRESS_SCALE = '.97'

const BANDS_GRID: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: Inset.I16_20_24,
  display: 'grid',
  gridTemplateColumns: Grid.C_repeat_2_minmax_0_1fr,
  gap: Gap.G12,
  alignContent: 'start',
  position: 'relative',
}

function activate(e: KeyboardEvent, open: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') open()
}

function HerePill() {
  const pill: CSSProperties = {
    font: Typo.sans(FontWeight.Semibold, FontSize.F11),
    color: 'var(--onbrand)',
    background: 'var(--brand)',
    padding: Inset.I3_7,
    borderRadius: Radius.Pill,
  }
  return <span style={pill} title={MapCopy.YOU_ARE_HERE}>{MapCopy.HERE_SHORT}</span>
}

const BandCard = memo(function BandCard({ paint, shown, onOpen }: BandCardProps) {
  const { band } = paint
  const open = () => onOpen(band.band)
  const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: Size.S20 }
  const pct: CSSProperties = { font: Typo.sans(FontWeight.Medium, FontSize.F12), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }
  return (
    <Surface
      padding="12px"
      gap={10}
      role="button"
      tabIndex={0}
      className="wm-press"
      data-here={band.here ? HERE_ATTR_ON : HERE_ATTR_OFF}
      data-testid={`band-${band.band}`}
      {...{ [BandWindowConfig.ATTR]: band.band }}
      style={{ cursor: 'pointer', ['--wm-press' as string]: PRESS_SCALE }}
      onClick={open}
      onKeyDown={(e) => activate(e, open)}
    >
      <div style={head}>
        <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F13), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {NumberFormat.range(band.start, band.end)}
        </span>
        {band.here ? <HerePill /> : <span style={pct}>{band.percent}%</span>}
      </div>
      <Tiles paint={paint} scale={TileScale.Large} shown={shown} />
    </Surface>
  )
})

/** Two-column grid of band cards; the scroll container is exposed for the marker scroll. */
export const BandsView = forwardRef<HTMLDivElement, BandsViewProps>(function BandsView({ paints, visible, onOpen }, ref) {
  return (
    <div ref={ref} style={BANDS_GRID} data-testid="map-bands">
      {paints.map((p) => (
        <BandCard key={p.band.band} paint={p} shown={visible.has(p.band.band)} onOpen={onOpen} />
      ))}
    </div>
  )
})

const CompactBand = memo(function CompactBand({ paint, shown, onOpen }: BandCardProps) {
  const label: CSSProperties = { font: Typo.mono(FontWeight.Semibold, FontSize.F10, Leading.L12), color: 'var(--muted)' }
  return (
    <div
      role="button"
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', gap: Gap.G4, cursor: 'pointer' }}
      data-testid={`band-${paint.band.band}`}
      {...{ [BandWindowConfig.ATTR]: paint.band.band }}
      onClick={() => onOpen(paint.band.band)}
      onKeyDown={(e) => activate(e, () => onOpen(paint.band.band))}
    >
      <span style={label}>{NumberFormat.int(paint.band.start)}</span>
      <Tiles paint={paint} scale={TileScale.Compact} shown={shown} />
    </div>
  )
})

/** Dense five-column overview of every band. */
export const CompactView = forwardRef<HTMLDivElement, BandsViewProps>(function CompactView({ paints, visible, onOpen }, ref) {
  const grid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: Grid.C_repeat_5_59px,
    justifyContent: 'space-between',
    rowGap: Gap.G10,
  }
  const hint: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F13, Leading.L18), color: 'var(--muted)', marginTop: Size.S16, textAlign: 'center' }
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: Inset.I16_20 }} data-testid="map-compact">
      <div style={grid}>
        {paints.map((p) => (
          <CompactBand key={p.band.band} paint={p} shown={visible.has(p.band.band)} onOpen={onOpen} />
        ))}
      </div>
      <div style={hint}>{MapCopy.COMPACT_HINT}</div>
    </div>
  )
})
