import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { LearnStatus, StatusPalette, TileScale } from '../status'
import { Radius, Size } from '../scale'

const POP_ANIMATION = 'wmPop 520ms ease-out'
const BAND_SIZE = 100
const COLUMNS = 10

interface Geometry {
  size: number
  radius: number
  gap: number
}

const GEOMETRY: Record<TileScale, Geometry> = {
  [TileScale.Large]: { size: Size.S12, radius: 3, gap: 2.5 },
  [TileScale.Compact]: { size: Size.S5, radius: 1, gap: 1 },
}

/** One CSS class per tile appearance, injected once, so a 10,000-tile map sets a class name per tile instead of inline styles. */
export class TileStyles {
  private static readonly PREFIX = 'wmt'
  private static readonly BASE = 'wm-anim'
  private static readonly known = new Map<string, string>()
  private static sheet: HTMLStyleElement | null = null

  static className(status: LearnStatus, scale: TileScale, here: boolean, pop: boolean): string {
    const key = `${status}|${scale}|${here}|${pop}`
    const hit = TileStyles.known.get(key)
    if (hit) return hit
    const name = `${TileStyles.BASE} ${TileStyles.PREFIX}${TileStyles.known.size}`
    TileStyles.known.set(key, name)
    TileStyles.inject(`.${TileStyles.PREFIX}${TileStyles.known.size - 1}`, status, scale, here, pop)
    return name
  }

  private static inject(selector: string, status: LearnStatus, scale: TileScale, here: boolean, pop: boolean): void {
    const g = GEOMETRY[scale]
    const paint = StatusPalette.tile(status, here, scale)
    const animation = pop ? POP_ANIMATION : 'none'
    const rule = `${selector}{width:${g.size}px;height:${g.size}px;border-radius:${g.radius}px;background:${paint.background};box-shadow:${paint.boxShadow};animation:${animation}}`
    const sheet = TileStyles.sheet ?? TileStyles.mount()
    sheet.appendChild(document.createTextNode(rule))
  }

  private static mount(): HTMLStyleElement {
    const el = document.createElement('style')
    document.head.appendChild(el)
    TileStyles.sheet = el
    return el
  }
}

export interface TileProps {
  status: LearnStatus
  scale?: TileScale
  here?: boolean
  pop?: boolean
  testId?: string
}

/** One map tile: Learning dotted, Known fill, Mastered inset ring, here ring. */
export const Tile = memo(function Tile({ status, scale = TileScale.Large, here = false, pop = false, testId }: TileProps) {
  return <div className={TileStyles.className(status, scale, here, pop)} data-testid={testId} />
})

/** Pixel height of a full band grid, used to reserve space for tiles that are not rendered. */
export class TileMetrics {
  static gridHeight(scale: TileScale): number {
    const g = GEOMETRY[scale]
    const rows = BAND_SIZE / COLUMNS
    return rows * g.size + (rows - 1) * g.gap
  }
}

/** Builds the markup of one band grid as a string; one parse is far cheaper than thousands of element creations. */
export class TileMarkup {
  static build(
    statuses: readonly LearnStatus[],
    scale: TileScale,
    hereIndex: number,
    pops: ReadonlySet<number> | undefined,
    rankStart: number | undefined,
  ): string {
    const parts: string[] = []
    for (let i = 0; i < statuses.length; i++) {
      const cls = TileStyles.className(statuses[i], scale, i === hereIndex, pops?.has(i) ?? false)
      const id = rankStart === undefined ? '' : ` data-testid="tile-${rankStart + i}"`
      parts.push(`<div class="${cls}"${id}></div>`)
    }
    return parts.join('')
  }
}

export interface TileGridProps {
  statuses: readonly LearnStatus[]
  scale?: TileScale
  hereIndex?: number
  popIndexes?: ReadonlySet<number>
  rankStart?: number
}

/** Renders a band of up to 100 tiles as plain divs in a 10-column grid. */
export const TileGrid = memo(function TileGrid({
  statuses,
  scale = TileScale.Large,
  hereIndex = -1,
  popIndexes,
  rankStart,
}: TileGridProps) {
  const g = GEOMETRY[scale]
  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUMNS},${g.size}px)`,
    gap: `${g.gap}px`,
    justifyContent: 'center',
    contain: 'layout paint style',
    height: TileMetrics.gridHeight(scale),
  }
  const html = useMemo(
    () => ({ __html: TileMarkup.build(statuses.slice(0, BAND_SIZE), scale, hereIndex, popIndexes, rankStart) }),
    [statuses, scale, hereIndex, popIndexes, rankStart],
  )
  return <div style={style} dangerouslySetInnerHTML={html} />
})

export interface LegendSwatchProps {
  status: LearnStatus
  size?: number
}

/** Small legend square using the same paint as tiles. */
export function LegendSwatch({ status, size = 11 }: LegendSwatchProps) {
  const paint = StatusPalette.tile(status, false, TileScale.Large)
  const small = size < 11
  const core = small ? 1.6 : 1.8
  const edge = small ? 2.2 : 2.4
  const dotted = `radial-gradient(circle,var(--dot) ${core}px,var(--lrn) ${edge}px)`
  const background = status === LearnStatus.Learning ? dotted : paint.background
  const style: CSSProperties = { width: size, height: size, borderRadius: Radius.R3, background, boxShadow: paint.boxShadow }
  return <span style={style} />
}
