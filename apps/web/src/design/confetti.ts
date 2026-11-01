export interface ConfettiPiece {
  x: string
  y: string
  size: string
  rotate: string
  delay: string
  color: string
}

/** Deterministic confetti layout identical to the design prototype. */
export class ConfettiLayout {
  private static readonly PIECE_COUNT = 18
  private static readonly PALETTE = ['var(--brand)', 'var(--kno)', 'var(--lrn)', 'var(--mas)']

  static hash(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  static pieces(count: number = ConfettiLayout.PIECE_COUNT): ConfettiPiece[] {
    return Array.from({ length: count }, (_, i) => ConfettiLayout.piece(i))
  }

  private static piece(i: number): ConfettiPiece {
    const h = ConfettiLayout.hash
    return {
      x: `${8 + h(i + 3) * 84}%`,
      y: `${4 + h(i + 40) * 20}%`,
      size: `${5 + h(i + 9) * 5}px`,
      rotate: `${Math.round(h(i + 7) * 90)}deg`,
      delay: `${Math.round(i * 35)}ms`,
      color: ConfettiLayout.PALETTE[i % ConfettiLayout.PALETTE.length],
    }
  }
}
