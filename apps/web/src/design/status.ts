/** Learning state of a word; values match the shared contract codes. */
export enum LearnStatus {
  Unknown = 'U',
  Learning = 'L',
  Known = 'K',
  Mastered = 'M',
}

export interface ChipStyle {
  label: string
  background: string
  dot: string
  ring: string
}

export interface TileStyle {
  background: string
  boxShadow: string
}

export enum TileScale {
  Large = 'large',
  Compact = 'compact',
}

interface TileMetrics {
  learnCore: number
  learnEdge: number
  markRing: number
  masteredRing: number
}

/** Maps a learning status to the exact chip and tile paint from the design. */
export class StatusPalette {
  private static readonly TILE_METRICS: Record<TileScale, TileMetrics> = {
    [TileScale.Large]: { learnCore: 2, learnEdge: 2.6, markRing: 2, masteredRing: 2 },
    [TileScale.Compact]: { learnCore: 1, learnEdge: 1.6, markRing: 1.5, masteredRing: 1 },
  }

  private static readonly STATUS_COLOR: Record<LearnStatus, string> = {
    [LearnStatus.Unknown]: 'var(--unk)',
    [LearnStatus.Learning]: 'var(--lrn)',
    [LearnStatus.Known]: 'var(--kno)',
    [LearnStatus.Mastered]: 'var(--mas)',
  }

  private static readonly STATUS_LABEL: Record<LearnStatus, string> = {
    [LearnStatus.Unknown]: 'Unknown',
    [LearnStatus.Learning]: 'Learning',
    [LearnStatus.Known]: 'Known',
    [LearnStatus.Mastered]: 'Mastered',
  }

  private static readonly NO_SHADOW = 'none'
  private static readonly CHIP_TINT_PERCENT = 18

  static color(status: LearnStatus): string {
    return StatusPalette.STATUS_COLOR[status]
  }

  static label(status: LearnStatus): string {
    return StatusPalette.STATUS_LABEL[status]
  }

  static chip(status: LearnStatus): ChipStyle {
    const label = StatusPalette.STATUS_LABEL[status]
    if (status === LearnStatus.Unknown) {
      return { label, background: 'var(--tint)', dot: 'transparent', ring: 'inset 0 0 0 1.5px var(--muted)' }
    }
    const color = StatusPalette.STATUS_COLOR[status]
    const background = `color-mix(in srgb,${color} ${StatusPalette.CHIP_TINT_PERCENT}%,var(--surface))`
    return { label, background, dot: color, ring: StatusPalette.NO_SHADOW }
  }

  static tile(status: LearnStatus, mark: boolean, scale: TileScale): TileStyle {
    const m = StatusPalette.TILE_METRICS[scale]
    if (mark) return { background: 'var(--surface)', boxShadow: `0 0 0 ${m.markRing}px var(--brand)` }
    if (status === LearnStatus.Learning) {
      const background = `radial-gradient(circle,var(--dot) ${m.learnCore}px,var(--lrn) ${m.learnEdge}px)`
      return { background, boxShadow: StatusPalette.NO_SHADOW }
    }
    if (status === LearnStatus.Known) return { background: 'var(--kno)', boxShadow: StatusPalette.NO_SHADOW }
    if (status === LearnStatus.Mastered) {
      return { background: 'var(--masin)', boxShadow: `inset 0 0 0 ${m.masteredRing}px var(--mas)` }
    }
    return { background: 'var(--unk)', boxShadow: StatusPalette.NO_SHADOW }
  }
}

export enum GradeTone {
  Again = 'again',
  Hard = 'hard',
  Good = 'good',
  Easy = 'easy',
}
