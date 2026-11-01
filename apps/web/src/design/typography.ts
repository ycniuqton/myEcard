/** Font families used by the design. */
export enum FontFamily {
  Sans = "'Inter',system-ui,sans-serif",
  Serif = "'Source Serif 4',Georgia,serif",
  Mono = "'IBM Plex Mono',monospace",
}

/** Builds CSS font shorthands matching the design specimens. */
export class Typo {
  static sans(weight: number, size: number, lineHeight?: number): string {
    return Typo.build(weight, size, FontFamily.Sans, lineHeight)
  }

  static serif(weight: number, size: number, lineHeight?: number): string {
    return Typo.build(weight, size, FontFamily.Serif, lineHeight)
  }

  static mono(weight: number, size: number, lineHeight?: number): string {
    return Typo.build(weight, size, FontFamily.Mono, lineHeight)
  }

  private static build(weight: number, size: number, family: FontFamily, lineHeight?: number): string {
    const lh = lineHeight ? `/${lineHeight}px` : ''
    return `${weight} ${size}px${lh} ${family}`
  }
}
