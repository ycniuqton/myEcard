import { describe, expect, it } from 'vitest'
import { ConfettiLayout } from './confetti'
import { LearnStatus, StatusPalette, TileScale } from './status'
import { Typo } from './typography'

describe('StatusPalette', () => {
  it('paints Unknown chip with a ring and no dot', () => {
    const chip = StatusPalette.chip(LearnStatus.Unknown)
    expect(chip.dot).toBe('transparent')
    expect(chip.ring).toContain('1.5px')
  })

  it('tints learning chips with color-mix', () => {
    expect(StatusPalette.chip(LearnStatus.Learning).background).toBe('color-mix(in srgb,var(--lrn) 18%,var(--surface))')
  })

  it('draws the here marker as a brand ring over any status', () => {
    const tile = StatusPalette.tile(LearnStatus.Known, true, TileScale.Large)
    expect(tile.boxShadow).toBe('0 0 0 2px var(--brand)')
  })

  it('uses thinner rings on compact tiles', () => {
    expect(StatusPalette.tile(LearnStatus.Mastered, false, TileScale.Compact).boxShadow).toBe('inset 0 0 0 1px var(--mas)')
    expect(StatusPalette.tile(LearnStatus.Learning, false, TileScale.Large).background).toContain('2.6px')
  })
})

describe('Typo and ConfettiLayout', () => {
  it('builds font shorthands', () => {
    expect(Typo.sans(600, 22, 28)).toBe("600 22px/28px 'Inter',system-ui,sans-serif")
  })

  it('is deterministic and produces 18 pieces', () => {
    expect(ConfettiLayout.pieces()).toHaveLength(18)
    expect(ConfettiLayout.pieces()).toEqual(ConfettiLayout.pieces())
  })
})
