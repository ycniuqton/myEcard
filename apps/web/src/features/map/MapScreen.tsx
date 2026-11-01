import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { Status } from '@wordmap/shared'
import { useAppStore } from '../../store'
import { BandTiles } from './BandTiles'
import { useBandWindow } from './BandWindow'
import { MapHeader } from './MapHeader'
import { MapMode, MapModeStore } from './MapMode'
import { BandsView, CompactView } from './MapViews'
import { usePopSequence } from './PopSequence'
import { Motion } from '../../design/styleValues'

const SCROLL_MARGIN = 90
const HERE_SELECTOR = '[data-here="1"]'

/** Scrolls the band list so the "you are here" card sits near the top. */
export class MarkerScroll {
  static apply(container: HTMLElement | null): boolean {
    const here = container?.querySelector<HTMLElement>(HERE_SELECTOR)
    if (!container || !here) return false
    container.scrollTop = Math.max(0, here.offsetTop - SCROLL_MARGIN)
    return true
  }
}

const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

function useMarkerScroll(ref: RefObject<HTMLDivElement>, mode: MapMode, markerRank: number | null): void {
  const touched = useRef(false)
  useEffect(() => {
    touched.current = false
    const el = ref.current
    const mark = () => {
      touched.current = true
    }
    USER_SCROLL_EVENTS.forEach((e) => el?.addEventListener(e, mark, { passive: true }))
    return () => USER_SCROLL_EVENTS.forEach((e) => el?.removeEventListener(e, mark))
  }, [ref, mode])
  useEffect(() => {
    if (!touched.current && mode === MapMode.Bands) MarkerScroll.apply(ref.current)
  }, [ref, mode, markerRank])
}

/** Knowledge map: overall progress, legend and the band grid in Bands or Compact mode. */
export function MapScreen() {
  const navigate = useNavigate()
  const progress = useAppStore((s) => s.progress)
  const total = useAppStore((s) => s.words.length)
  const [mode, setMode] = useState<MapMode>(() => MapModeStore.load())
  const scroller = useRef<HTMLDivElement>(null)
  const { held, pops } = usePopSequence(progress.statusByRank)
  const paints = useMemo(
    () => progress.bands.map((b) => BandTiles.paint(b, progress.statusByRank, held, pops, progress.markerRank)),
    [progress, held, pops],
  )
  useMarkerScroll(scroller, mode, progress.markerRank)
  const visible = useBandWindow(scroller, mode === MapMode.Compact, paints.length)
  const changeMode = useCallback((next: MapMode) => {
    setMode(next)
    MapModeStore.save(next)
  }, [])
  const open = useCallback((band: number) => navigate(`/band/${band}`), [navigate])
  const known = progress.counts[Status.Known] + progress.counts[Status.Mastered]
  return (
    <div
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: Motion.A_wmIn_220ms_ease_out }}
      data-testid="map-screen"
    >
      <MapHeader
        mode={mode}
        onMode={changeMode}
        total={total}
        known={known}
        percent={Math.round(progress.percentKnown)}
        counts={progress.counts}
      />
      {mode === MapMode.Bands ? (
        <BandsView ref={scroller} paints={paints} visible={visible} onOpen={open} />
      ) : (
        <CompactView ref={scroller} paints={paints} visible={visible} onOpen={open} />
      )}
    </div>
  )
}
