import { describe, expect, it } from 'vitest'
import { ProgressSeries } from './ProgressSeries'

describe('ProgressSeries', () => {
  it('carries cumulative totals forward over 30 days and adds the assumed base', () => {
    const series = ProgressSeries.knownSeries(
      [{ date: '2026-10-20', total: 4 }, { date: '2026-10-25', total: 10 }],
      110,
      '2026-10-30',
    )
    expect(series.values).toHaveLength(30)
    expect(series.values[0]).toBe(100)
    expect(series.values[29]).toBe(110)
    expect(series.gain).toBe(10)
    expect(series.startDate).toBe('2026-10-01')
  })

  it('draws a flat line without NaN when nothing changed', () => {
    const series = ProgressSeries.knownSeries([], 0, '2026-10-30')
    expect(series.points).not.toContain('NaN')
    expect(series.gain).toBe(0)
  })

  it('scales bars to the busiest day with a visible minimum', () => {
    const bars = ProgressSeries.bars([
      { date: 'a', count: 0 },
      { date: 'b', count: 10 },
      { date: 'c', count: 5 },
    ])
    expect(bars.map(b => b.heightPct)).toEqual([4, 100, 50])
    expect(bars[2].current).toBe(true)
  })

  it('maps points inside the viewbox', () => {
    const pts = ProgressSeries.polyline([0, 10]).split(' ')
    expect(pts[0]).toBe('0.0,105.0')
    expect(pts[1]).toBe('300.0,5.0')
  })

  it('pluralises day labels', () => {
    expect(ProgressSeries.daysLabel(1)).toBe('1 day')
    expect(ProgressSeries.daysLabel(23)).toBe('23 days')
  })
})
