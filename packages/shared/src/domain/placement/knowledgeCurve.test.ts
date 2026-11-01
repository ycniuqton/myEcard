import { describe, expect, it } from 'vitest'
import { KnowledgeCurve, PlacementConfig } from '../../index'

const pt = (band: number, value: number, weight = 6) => ({ band, value, weight })

describe('KnowledgeCurve', () => {
  it('keeps an already non-increasing sequence unchanged', () => {
    const curve = KnowledgeCurve.fit([pt(1, 1), pt(5, 0.5), pt(9, 0)])
    expect([1, 5, 9].map(b => curve.valueAt(b))).toEqual([1, 0.5, 0])
  })

  it('pools violators weighted by the words shown', () => {
    const curve = KnowledgeCurve.fit([pt(3, 0.5, 6), pt(7, 1, 12)])
    expect(curve.valueAt(3)).toBeCloseTo(5 / 6)
    expect(curve.valueAt(7)).toBeCloseTo(5 / 6)
  })

  it('interpolates linearly and extrapolates flat beyond both ends', () => {
    const curve = KnowledgeCurve.fit([pt(4, 1), pt(8, 0.2)])
    expect(curve.valueAt(6)).toBeCloseTo(0.6)
    expect(curve.valueAt(1)).toBe(1)
    expect(curve.valueAt(100)).toBeCloseTo(0.2)
  })

  it('sums expected known words over band sizes and finds the confident band', () => {
    const curve = KnowledgeCurve.fit([pt(1, 1), pt(3, 0)])
    const sizes = new Map([[1, 100], [2, 100], [3, 100]])
    expect(curve.expectedKnown(sizes)).toBeCloseTo(150)
    expect(curve.confidentBand([1, 2, 3])).toBe(1)
    expect(PlacementConfig.CONFIDENT_KNOWN).toBe(0.9)
  })

  it('is empty without usable points and then knows nothing', () => {
    const curve = KnowledgeCurve.fit([pt(2, 1, 0)])
    expect(curve.isEmpty).toBe(true)
    expect(curve.valueAt(5)).toBe(0)
    expect(curve.confidentBand([1, 2])).toBe(0)
  })
})
