import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** Tunables and DOM markers of band virtualisation on the map. */
export class BandWindowConfig {
  static readonly MARGIN = '300px 0px'
  static readonly DENSE_MARGIN = '150px 0px'
  static readonly ATTR = 'data-band'
  static readonly SELECTOR = '[data-band]'
  static readonly NONE: ReadonlySet<number> = new Set<number>()
}

/** Tracks which band cards are inside or near the scroll viewport. */
export class BandWindowTracker {
  private visible = new Set<number>()

  constructor(private readonly publish: (bands: ReadonlySet<number>) => void) {}

  apply(entries: readonly IntersectionObserverEntry[]): void {
    const next = new Set(this.visible)
    for (const entry of entries) {
      const band = Number((entry.target as HTMLElement).getAttribute(BandWindowConfig.ATTR))
      if (entry.isIntersecting) next.add(band)
      else next.delete(band)
    }
    this.visible = next
    this.publish(next)
  }
}

/** Returns the set of band numbers whose tiles should be rendered; cards carry data-band. */
export function useBandWindow(scroller: RefObject<HTMLElement>, dense: boolean, cardCount: number): ReadonlySet<number> {
  const [visible, setVisible] = useState<ReadonlySet<number>>(BandWindowConfig.NONE)
  useEffect(() => {
    const root = scroller.current
    if (!root) return undefined
    const tracker = new BandWindowTracker(setVisible)
    const observer = new IntersectionObserver(entries => tracker.apply(entries), { root, rootMargin: dense ? BandWindowConfig.DENSE_MARGIN : BandWindowConfig.MARGIN })
    root.querySelectorAll(BandWindowConfig.SELECTOR).forEach(card => observer.observe(card))
    return () => {
      observer.disconnect()
      setVisible(BandWindowConfig.NONE)
    }
  }, [scroller, dense, cardCount])
  return visible
}
